import { apiClient } from "@/src/api/client";
import {
    PRODUCTS_USER_INVENTORY_ADD,
    PRODUCTS_USER_INVENTORY_ITEM,
} from "@/src/api/endpoints";
import { MULTIPART_CONFIG, readImage, toFormData } from "@/src/api/formData";
import type { CatalogProduct } from "@/src/api/catalog";
import { createRestock } from "@/src/api/products";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "react-native";

const normalizeApiPath = (path: string) => path.replace(/^\/api(?=\/)/, "");

// Pull a human-readable message out of an axios/server error so the user (and
// we) see the real reason a save failed instead of a generic string.
function extractApiError(error: any): string {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object") {
    if (typeof data.detail === "string") return data.detail;
    if (typeof data.message === "string") return data.message;
    // DRF-style field errors, e.g. { image: ["..."], category: ["..."] }
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = (data as any)[firstKey];
      const msg = Array.isArray(val) ? val[0] : val;
      if (msg != null) {
        return firstKey === "non_field_errors"
          ? String(msg)
          : `${firstKey}: ${msg}`;
      }
    }
  }

  // No HTTP response → axios "Network Error". The real cause is in the error
  // code and the native React Native XHR response, so surface those.
  if (!error?.response) {
    const parts: string[] = [];
    if (error?.code) parts.push(String(error.code));
    const rn = error?.request?._response;
    if (typeof rn === "string" && rn.trim() && rn !== "null") {
      parts.push(rn.trim());
    }
    const url = `${error?.config?.baseURL ?? ""}${error?.config?.url ?? ""}`;
    if (url) parts.push(`→ ${url}`);
    if (error?.message) parts.push(error.message);
    return parts.length ? parts.join(" | ") : "Network error";
  }

  return error?.message || "Please try again.";
}


export interface Product {
  id: string;
  name: string;
  category: string;
  barcode: string;
  image?: {
    uri: string;
    type?: string;
    fileName?: string;
    fileSize?: number;
  } | null;
  quantityType: string;
  unitsInStock: number;
  costPrice: number;
  sellingPrice: number;
  lowStockThreshold: number;
  expiryDate: string;
  supplier: {
    name: string;
    phone: string;
  };
  dateAdded: string;
  userId: string;
}

export interface FormData {
  productName: string;
  barcode: string;
  sku: string;
  category: string;
  productImage: {
    uri: string;
    type?: string;
    fileName?: string;
  } | null;
  quantityType: string;
  numberOfItems: string;
  costPrice: string;
  sellingPrice: string;
  lowStockThreshold: string;
  expiryDate: {
    day: string;
    month: string;
    year: string;
  };
  supplier: {
    name: string;
    phone: string;
  };
  unitsPerCarton: string;
  numberOfCartons: string;
  costPricePerCarton: string;
  sellingPricePerCarton: string;
  sellingPricePerUnit: string;
}

export interface ImageAsset {
  uri: string;
  type?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
}

const INITIAL_FORM: FormData = {
  productName: "",
  barcode: "",
  sku: "",
  category: "",
  productImage: null,
  quantityType: "Single Items",
  numberOfItems: "",
  costPrice: "",
  sellingPrice: "",
  lowStockThreshold: "",
  expiryDate: { day: "", month: "", year: "" },
  supplier: { name: "", phone: "" },
  unitsPerCarton: "",
  numberOfCartons: "",
  costPricePerCarton: "",
  sellingPricePerCarton: "",
  sellingPricePerUnit: "",
};

interface AddProductFormOptions {
  isRestockMode?: boolean;
  restockInventoryId?: string;
  isEditMode?: boolean;
  editInventoryId?: string;
}

export function useAddProductForm(
  onSaveProduct: (product: Product) => void,
  options?: AddProductFormOptions,
) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  // Set when the user picked a product from the shared catalog search.
  const [catalogProduct, setCatalogProduct] = useState<CatalogProduct | null>(null);

  const invalidateInventoryQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ["user-inventory"] });
  };

  const updateFormData = (field: string, value: string | ImageAsset | null) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof FormData] as any),
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setCatalogProduct(null);
    setShowSuccessModal(false);
  };

  /**
   * Prefill from a shared catalog product: what the catalog knows (name,
   * category, barcode, photo, packaging). Stock, prices, threshold, expiry and
   * supplier are the shop's own, so they are left for the user to fill in.
   */
  const populateFromCatalog = (item: CatalogProduct) => {
    const quantityType =
      item.quantity_type === "carton"
        ? "Carton"
        : item.quantity_type === "both"
          ? "Both"
          : "Single Items";
    setCatalogProduct(item);
    setFormData({
      ...INITIAL_FORM,
      productName: item.name,
      category: item.category?.name ?? "",
      barcode: item.barcode ?? "",
      sku: item.barcode ?? "",
      productImage: item.image_url ? { uri: item.image_url } : null,
      quantityType,
      unitsPerCarton: item.units_in_carton ? String(item.units_in_carton) : "",
    });
  };

  const populateFromProduct = (product: Product) => {
    const rawExpiry = product.expiryDate || "";
    let day = "";
    let month = "";
    let year = "";

    if (rawExpiry.includes("-")) {
      const [y, m, d] = rawExpiry.split("-");
      year = y || "";
      month = m || "";
      day = d || "";
    } else if (rawExpiry.includes("/")) {
      const [m, d, y] = rawExpiry.split("/");
      month = m || "";
      day = d || "";
      year = y || "";
    }

    setFormData({
      productName: product.name,
      barcode: product.barcode,
      sku: product.barcode,
      category: product.category,
      productImage: product.image || null,
      quantityType: product.quantityType,
      numberOfItems: product.unitsInStock.toString(),
      costPrice: product.costPrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      lowStockThreshold: product.lowStockThreshold.toString(),
      expiryDate: { day, month, year },
      supplier: product.supplier,
      unitsPerCarton: "",
      numberOfCartons: "",
      costPricePerCarton: "",
      sellingPricePerCarton: "",
      sellingPricePerUnit: "",
    });
  };

  const validateStep = (step: number): boolean => {
    if (step === 0) {
      if (!formData.productName.trim()) {
        Alert.alert(
          "Missing Information",
          "Please enter a valid product name.",
        );
        return false;
      }
      if (!formData.category.trim()) {
        Alert.alert(
          "Missing Information",
          "Please select or enter a product category.",
        );
        return false;
      }
    } else if (step === 1) {
      if (formData.quantityType === "Single Items") {
        const units = parseInt(formData.numberOfItems, 10);
        const cost = parseFloat(formData.costPrice);
        const selling = parseFloat(formData.sellingPrice);

        if (isNaN(units) || units <= 0) {
          Alert.alert(
            "Invalid Quantity",
            "Please enter a valid number of units in stock (at least 1).",
          );
          return false;
        }
        if (isNaN(cost) || cost < 0) {
          Alert.alert(
            "Invalid Cost Price",
            "Please enter a valid cost price (₦0 or higher).",
          );
          return false;
        }
        if (isNaN(selling) || selling <= 0) {
          Alert.alert(
            "Invalid Selling Price",
            "Please enter a valid selling price greater than ₦0.",
          );
          return false;
        }
      } else if (formData.quantityType === "Carton") {
        const unitsPerCarton = parseInt(formData.unitsPerCarton, 10);
        const cartons = parseInt(formData.numberOfCartons, 10);
        const costPerCarton = parseFloat(formData.costPricePerCarton);
        const sellingPerCarton = parseFloat(formData.sellingPricePerCarton);

        if (isNaN(unitsPerCarton) || unitsPerCarton <= 0) {
          Alert.alert("Invalid Input", "Please enter units per carton (at least 1).");
          return false;
        }
        if (isNaN(cartons) || cartons <= 0) {
          Alert.alert("Invalid Input", "Please enter number of cartons (at least 1).");
          return false;
        }
        if (isNaN(costPerCarton) || costPerCarton < 0) {
          Alert.alert("Invalid Input", "Please enter a valid cost price per carton.");
          return false;
        }
        if (isNaN(sellingPerCarton) || sellingPerCarton <= 0) {
          Alert.alert("Invalid Input", "Please enter a valid selling price per carton greater than ₦0.");
          return false;
        }
      } else if (formData.quantityType === "Both") {
        const unitsPerCarton = parseInt(formData.unitsPerCarton, 10);
        const cartons = parseInt(formData.numberOfCartons, 10);
        const costPerCarton = parseFloat(formData.costPricePerCarton);
        const sellingPerCarton = parseFloat(formData.sellingPricePerCarton);
        const sellingPerUnit = parseFloat(formData.sellingPricePerUnit);

        if (isNaN(unitsPerCarton) || unitsPerCarton <= 0) {
          Alert.alert("Invalid Input", "Please enter units per carton (at least 1).");
          return false;
        }
        if (isNaN(cartons) || cartons <= 0) {
          Alert.alert("Invalid Input", "Please enter number of cartons (at least 1).");
          return false;
        }
        if (isNaN(costPerCarton) || costPerCarton < 0) {
          Alert.alert("Invalid Input", "Please enter a valid cost price per carton.");
          return false;
        }
        if (isNaN(sellingPerCarton) || sellingPerCarton <= 0) {
          Alert.alert("Invalid Input", "Please enter a valid selling price per carton greater than ₦0.");
          return false;
        }
        if (isNaN(sellingPerUnit) || sellingPerUnit <= 0) {
          Alert.alert("Invalid Input", "Please enter a valid selling price per unit greater than ₦0.");
          return false;
        }
      }
    } else if (step === 2) {
      // Step 2 validations (Dates, Threshold, Supplier)
      const currentYear = new Date().getFullYear();
      const { year, month, day } = formData.expiryDate;
      if (year || month || day) {
        const numYear = parseInt(year, 10);
        const numMonth = parseInt(month, 10);
        const numDay = parseInt(day, 10);

        if (year && (isNaN(numYear) || numYear < currentYear || numYear > currentYear + 50)) {
          Alert.alert("Invalid Expiry Year", `Please enter a realistic expiry year (${currentYear} or later).`);
          return false;
        }
        if (month && (isNaN(numMonth) || numMonth < 1 || numMonth > 12)) {
          Alert.alert("Invalid Expiry Month", "Please enter a valid month between 1 and 12.");
          return false;
        }
        if (day && (isNaN(numDay) || numDay < 1 || numDay > 31)) {
          Alert.alert("Invalid Expiry Day", "Please enter a valid day between 1 and 31.");
          return false;
        }
      }
      if (formData.lowStockThreshold) {
        const threshold = parseInt(formData.lowStockThreshold, 10);
        if (isNaN(threshold) || threshold < 0) {
          Alert.alert("Invalid Threshold", "Low stock threshold cannot be negative.");
          return false;
        }
      }
    }
    return true;
  };

  const handleSaveProduct = async () => {
    if (saving) return;
    setSaving(true);

    try {
      if (options?.isRestockMode && options?.restockInventoryId) {
        const today = new Date().toISOString().split("T")[0];
        const expiryDate =
          formData.expiryDate.year && formData.expiryDate.month
            ? `${formData.expiryDate.year}-${String(
                Number(formData.expiryDate.month),
              ).padStart(2, "0")}-${String(
                Number(formData.expiryDate.day || "1"),
              ).padStart(2, "0")}`
            : undefined;

        const quantityAdded =
          parseInt(formData.numberOfItems) ||
          parseInt(formData.numberOfCartons) ||
          0;
        const buyingPrice =
          formData.costPrice || formData.costPricePerCarton || "0";
        const sellingPrice =
          formData.sellingPrice ||
          formData.sellingPricePerCarton ||
          formData.sellingPricePerUnit ||
          "0";

        await createRestock({
          inventoryId: Number(options.restockInventoryId),
          quantity_added: quantityAdded,
          buying_price: buyingPrice,
          supplier: 0,
          supplier_name: formData.supplier.name || "",
          quantity_type: formData.quantityType || "Single Items",
          cost_price: buyingPrice,
          selling_price: sellingPrice,
          low_stock_threshold: parseInt(formData.lowStockThreshold) || 0,
          supplier_phone: formData.supplier.phone || "",
          date_arrived: today,
          expiry_date: expiryDate,
          notes: "Restocked via app",
        });

        await invalidateInventoryQueries();
        setShowSuccessModal(true);
        return;
      }

      if (options?.isEditMode && options?.editInventoryId) {
        const expiryDate =
          formData.expiryDate.year && formData.expiryDate.month
            ? `${formData.expiryDate.year}-${String(
                Number(formData.expiryDate.month),
              ).padStart(2, "0")}-${String(
                Number(formData.expiryDate.day || "1"),
              ).padStart(2, "0")}`
            : undefined;

        const editPayload: Record<string, any> = {
          name: formData.productName,
          category: formData.category,
          barcode: formData.barcode || formData.sku || "",
          units_in_stock: parseInt(formData.numberOfItems) || 0,
          unit_type: formData.quantityType || "Single Items",
          cost_price: formData.costPrice || "0",
          selling_price: formData.sellingPrice || "0",
          low_stock_threshold: parseInt(formData.lowStockThreshold) || 0,
          expiry_date: expiryDate,
          supplier_name: formData.supplier.name || "",
          supplier_phone: formData.supplier.phone || "",
        };

        const editEndpoint = normalizeApiPath(
          PRODUCTS_USER_INVENTORY_ITEM(options.editInventoryId),
        );

        const imageFile = readImage(formData.productImage);

        let updated: any;

        if (imageFile) {
          // Multipart PATCH: all fields + image together via the axios client
          // (keeps auth/refresh interceptors; correct multipart boundary).
          const fd = toFormData({
            ...editPayload,
            // buying_price is also required by the server
            buying_price: editPayload.cost_price || "0",
            image: imageFile,
          });
          const { data } = await apiClient.patch(
            editEndpoint,
            fd,
            MULTIPART_CONFIG,
          );
          updated = data;
        } else {
          // No new local image  plain JSON PATCH.
          if (formData.productImage?.uri?.startsWith("http")) {
            editPayload.image_url = formData.productImage.uri;
          }
          const { data } = await apiClient.patch(editEndpoint, editPayload);
          updated = data;
        }

        await invalidateInventoryQueries();

        onSaveProduct({
          id: String(updated?.id ?? options.editInventoryId),
          name: updated?.name ?? formData.productName,
          category: updated?.category ?? formData.category,
          barcode: String(updated?.barcode ?? formData.barcode ?? ""),
          image: updated?.image_url
            ? { uri: updated.image_url }
            : formData.productImage,
          quantityType:
            updated?.quantity_type ||
            updated?.unit_type ||
            formData.quantityType ||
            "Single Items",
          unitsInStock: Number(
            updated?.units_in_stock ?? formData.numberOfItems ?? 0,
          ),
          costPrice: Number(updated?.cost_price ?? formData.costPrice ?? 0),
          sellingPrice: Number(
            updated?.selling_price ?? formData.sellingPrice ?? 0,
          ),
          lowStockThreshold: Number(
            updated?.low_stock_threshold ?? formData.lowStockThreshold ?? 0,
          ),
          expiryDate: updated?.expiry_date || expiryDate || "",
          supplier: {
            name: updated?.supplier_name ?? formData.supplier.name,
            phone: updated?.supplier_phone ?? formData.supplier.phone,
          },
          dateAdded:
            updated?.added_at ||
            updated?.updated_at ||
            new Date().toISOString(),
          userId: "api-user",
        });

        setShowSuccessModal(true);
        return;
      }

      const expiry =
        formData.expiryDate.year && formData.expiryDate.month
          ? `${formData.expiryDate.year}-${String(
              Number(formData.expiryDate.month),
            ).padStart(2, "0")}-${String(
              Number(formData.expiryDate.day || "1"),
            ).padStart(2, "0")}`
          : undefined;

      const buyingPrice = formData.costPrice || formData.costPricePerCarton || "0";
      const sellingPrice =
        formData.sellingPrice ||
        formData.sellingPricePerCarton ||
        formData.sellingPricePerUnit ||
        "0";
      const unitsInStock =
        parseInt(formData.numberOfItems) ||
        (parseInt(formData.numberOfCartons) || 0) *
          (parseInt(formData.unitsPerCarton) || 1);

      const payload: Record<string, any> = {
        // Linking to the catalog product: the backend keeps only the values the
        // user changed as the shop's own; the rest follow catalog corrections.
        ...(catalogProduct
          ? { product: catalogProduct.id, quantity: unitsInStock, buying_price: buyingPrice }
          : {}),
        name: formData.productName,
        category: formData.category,
        barcode: formData.barcode || formData.sku || "",
        units_in_stock: unitsInStock,
        unit_type: formData.quantityType || "Single Items",
        cost_price: buyingPrice,
        selling_price: sellingPrice,
        low_stock_threshold: parseInt(formData.lowStockThreshold) || 0,
        expiry_date: expiry,
        supplier_name: formData.supplier.name || "",
        supplier_phone: formData.supplier.phone || "",
      };

      // A catalog photo stays the catalog's (don't copy its URL onto the item).
      if (
        catalogProduct?.image_url &&
        formData.productImage?.uri === catalogProduct.image_url
      ) {
        delete payload.image_url;
      }

      const imageFile = readImage(formData.productImage);

      if (imageFile) {
        // Multipart POST: all fields + image together via the axios client.
        const fd = toFormData({
          ...payload,
          buying_price: buyingPrice,
          image: imageFile,
        });
        await apiClient.post(PRODUCTS_USER_INVENTORY_ADD, fd, MULTIPART_CONFIG);
      } else {
        // No image  plain JSON POST.
        await apiClient.post(PRODUCTS_USER_INVENTORY_ADD, payload);
      }

      await invalidateInventoryQueries();
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error(
        "Error adding product:",
        error?.response?.status,
        error?.response?.data ?? error,
      );
      const status = error?.response?.status;
      const data = error?.response?.data;
      if (data?.code === "already_in_inventory") {
        Alert.alert(
          "Already in your inventory",
          `You already stock this as "${data.inventory_name}". Restock it from your inventory instead.`,
        );
        return;
      }
      const detail =
        typeof data?.error === "string" ? data.error : extractApiError(error);
      Alert.alert("Error", status ? `(${status}) ${detail}` : detail);
    } finally {
      setSaving(false);
    }
  };

  return {
    formData,
    saving,
    showSuccessModal,
    updateFormData,
    resetForm,
    populateFromProduct,
    populateFromCatalog,
    catalogProduct,
    validateStep,
    handleSaveProduct,
    setShowSuccessModal,
  };
}

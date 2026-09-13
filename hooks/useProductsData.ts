import { apiClient } from "@/src/api/client";
import * as endpoints from "@/src/api/endpoints";
import {
    createProduct,
    ProductPayload,
    updateProduct,
} from "@/src/api/products";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

interface ProductsDataParams {
  search?: string;
  filter?: "inStock" | "outOfStock" | "expiring";
  page?: number;
  page_size?: number;
  category?: number;
  sort?: "recent" | "name" | "name_desc";
}

export function useProductsData(params: ProductsDataParams = {}) {
  const { search, filter, page, page_size, category, sort } = params;
  const queryClient = useQueryClient();
  // Product categories
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () =>
      (await apiClient.get(endpoints.PRODUCTS_CATEGORIES)).data,
  });

  // All products (optionally filtered by search)
  const {
    data: products,
    isLoading: loadingProducts,
    isFetching: fetchingProducts,
  } = useQuery({
    queryKey: ["products", search],
    queryFn: async () => {
      const queryParams = search ? { search } : {};
      return (
        await apiClient.get(endpoints.PRODUCTS_ITEMS, { params: queryParams })
      ).data;
    },
    // Keep showing the previous results while a new search fetches, so the
    // page (search bar, filters) stays put instead of flashing a full loader.
    placeholderData: keepPreviousData,
  });

  // User inventory (optionally filtered by search)
  const {
    data: userInventory,
    isLoading: loadingInventory,
    isFetching: fetchingInventory,
  } = useQuery({
    queryKey: [
      "user-inventory",
      search,
      filter,
      page ?? 0,
      page_size ?? 10,
      category ?? null,
      sort ?? "recent",
    ],
    queryFn: async () => {
      const queryParams = {
        ...(search ? { search } : {}),
        ...(filter ? { filter } : {}),
        ...(page !== undefined ? { page } : {}),
        ...(page_size !== undefined ? { page_size } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(sort ? { sort } : {}),
      };
      return (
        await apiClient.get(endpoints.PRODUCTS_USER_INVENTORY, {
          params: queryParams,
        })
      ).data;
    },
    placeholderData: keepPreviousData,
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (payload: ProductPayload) => {
      return createProduct(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  // Patch product mutation
  const patchProductMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number | string;
      payload: Partial<ProductPayload>;
    }) => {
      return updateProduct(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  // Delete user inventory mutation
  const deleteUserInventoryMutation = useMutation({
    mutationFn: async (id: number | string) => {
      await apiClient.delete(`${endpoints.PRODUCTS_USER_INVENTORY}/${id}/`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-inventory"] });
    },
  });

  // Patch user inventory mutation
  const patchUserInventoryMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number | string;
      payload: any;
    }) => {
      const { data } = await apiClient.patch(
        `${endpoints.PRODUCTS_USER_INVENTORY}/${id}/`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-inventory"] });
    },
  });

  // Add to user inventory mutation
  const addToUserInventoryMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post(
        endpoints.PRODUCTS_USER_INVENTORY,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-inventory"] });
    },
  });

  const dataLoading = loadingCategories || loadingProducts || loadingInventory;

  return {
    dataLoading,
    loadingCategories,
    loadingProducts,
    loadingInventory,
    fetchingProducts,
    fetchingInventory,
    categories,
    products,
    userInventory,
    createProductMutation,
    patchProductMutation,
    deleteUserInventoryMutation,
    patchUserInventoryMutation,
    addToUserInventoryMutation,
  };
}

// src/api/catalog.ts
// The shared product catalog: products every shop can search and add to its
// own inventory. Admins curate it in the Django admin.
import { apiClient } from "./client";

export interface CatalogProduct {
  id: number;
  name: string;
  brand?: string | null;
  code?: string;
  barcode: string | null;
  description?: string | null;
  category: { id: number; name: string } | null;
  image_url: string | null;
  image_credit?: string;
  quantity_type: "single_items" | "carton" | "both" | string;
  units_in_carton: number | null;
  also_known_as: string[];
  /** The local name the search matched on ("Titus" for mackerel), if any. */
  matched_alias: string | null;
  /** Whether this shop already stocks it. */
  in_inventory: boolean;
  inventory_id: number | null;
  inventory_name: string | null;
}

export interface CatalogPage {
  count: number;
  page_size: number;
  current_page: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  results: CatalogProduct[];
}

/** Zero-based pages. Matches name, brand, category, barcode and local aliases. */
export async function searchCatalog(params: {
  search?: string;
  category?: string | number;
  barcode?: string;
  page?: number;
  page_size?: number;
}): Promise<CatalogPage> {
  const { data } = await apiClient.get<CatalogPage>("/products/catalog/", { params });
  return data;
}

export async function getCatalogProduct(id: number | string): Promise<CatalogProduct> {
  const { data } = await apiClient.get<CatalogProduct>(`/products/catalog/${id}/`);
  return data;
}

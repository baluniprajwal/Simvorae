export interface ProductImage {
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

export interface PackageDetails {
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  weightKg: number;
}

export interface Product {
  _id: string;
  legacyId: number;
  name: string;
  slug: string;
  price: number;
  category: string;
  material: string;
  color: string;
  image: string;
  images: ProductImage[];
  description?: string;
  keyFeatures: string[];
  whyLoveIt?: string;
  dimensions?: string;
  shippingReturns?: string;
  moreInformation?: string;
  packageDetails: PackageDetails;
  featured: boolean;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
}

export interface ProductsResponse {
  success: boolean;
  count: number;
  products: Product[];
}

export interface ProductFiltersResponse {
  success: boolean;
  filters: {
    categories: string[];
    colors: string[];
    materials: string[];
  };
}

export interface ProductDetailResponse {
  success: boolean;
  product: Product;
  similarProducts: Product[];
}

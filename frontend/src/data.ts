export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  material: string;
  color: string;
  image: string;
  description?: string;
}

export const products: Product[] = [
  { id: 1, name: "The Drape Tote", price: 68000, category: "Classic Tote", material: "Calfskin", color: "Black", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop", description: "Sculptural and uncompromised. The Drape Tote abandons rigid framing for a fluid, brutalist silhouette." },
  { id: 2, name: "Structured Hobo", price: 33600, category: "Hobo Shoulder Bag", material: "Suede", color: "Brown", image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop", description: "A study in geometry and space. Rigid foundation contrasting with a perfectly collapsing upper." },
  { id: 3, name: "Woven Crossbody", price: 48000, category: "Crossbody Bag", material: "Vegan Leather", color: "Tan", image: "https://images.unsplash.com/photo-1550614000-4b95d4ed79fb?q=80&w=800&auto=format&fit=crop", description: "Architectural lattice work creates an interplay of light and shadow on this compact masterpiece." },
  { id: 4, name: "Classic Box Clutch", price: 96000, category: "Chain Clutch", material: "Calfskin", color: "White", image: "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800&auto=format&fit=crop", description: "Absolute minimalism. A pure calfskin cuboid designed for essential evenings." },
  { id: 5, name: "Leather Carryall", price: 36000, category: "Classic Tote", material: "Full Grain Leather", color: "Brown", image: "https://images.unsplash.com/photo-1485231183945-fd66023fd5ca?q=80&w=800&auto=format&fit=crop", description: "Utilitarian volume. Full grain leather that develops a profound patina with continuous heavy wear." },
  { id: 6, name: "Soft Calfskin Pouch", price: 25600, category: "Hobo Shoulder Bag", material: "Calfskin", color: "White", image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop", description: "Deconstructed constraint. A volume of leather that shapes itself perfectly to whatever it holds." },
  { id: 7, name: "Acetate Chain Mini", price: 22400, category: "Crossbody Bag", material: "Vegan Leather", color: "Black", image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800&auto=format&fit=crop", description: "Raw material exposed. Chunky acetate linked seamlessly with smooth monochromatic surfaces." },
  { id: 8, name: "Calfskin Weekend", price: 148000, category: "Top Handle Bag", material: "Calfskin", color: "Brown", image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop", description: "Substantial form for transit. Impeccably detailed for the modern nomadic aesthetic." },
  { id: 9, name: "Structured Weekender", price: 76000, category: "Top Handle Bag", material: "Full Grain Leather", color: "Black", image: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=800&auto=format&fit=crop", description: "Industrial capacity. Over-engineered handles and uncompromising heavy-gauge leather construction." },
  { id: 10, name: "Mono Top-Handle", price: 256000, category: "Top Handle Bag", material: "Exotic Leather", color: "Tan", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop", description: "The pinnacle of our atelier. A solitary handle atop an aggressively pristine silhouette." },
  { id: 11, name: "Brutalist Minaudiere", price: 17600, category: "Chain Clutch", material: "Vegan Leather", color: "Silver", image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=800&auto=format&fit=crop", description: "Hard-shell evening armor. Reflective and uncompromising geometric precision." },
  { id: 12, name: "Silk Evening Bag", price: 71200, category: "Chain Clutch", material: "Silk/Leather", color: "White", image: "https://images.unsplash.com/photo-1515347619362-e9326e0e017e?q=80&w=800&auto=format&fit=crop", description: "Textural dichotomy. Delicate woven silk bound radically by structured leather borders." },
];

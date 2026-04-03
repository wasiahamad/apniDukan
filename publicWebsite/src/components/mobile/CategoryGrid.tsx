import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type CategoryItem = {
  slug: string;
  name: string;
  icon?: string;
};

type CategoryGridProps = {
  categories: CategoryItem[];
  onSelect: (slug: string) => void;
  className?: string;
};

export default function CategoryGrid({ categories, onSelect, className }: CategoryGridProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {categories.map((cat) => (
        <motion.button
          key={cat.slug}
          type="button"
          onClick={() => onSelect(cat.slug)}
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all duration-200 hover:shadow-md"
        >
          <div className="text-lg">{cat.icon || "🏪"}</div>
          <p className="mt-1 text-sm font-medium text-slate-800 line-clamp-1">{cat.name}</p>
        </motion.button>
      ))}
    </div>
  );
}

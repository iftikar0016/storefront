"use client";

import { useEffect, useState } from "react";
import { getRecentlyViewedProductsAction } from "@/app/actions";
import { toProductCardData } from "@/ui/components/plp";
import { ProductCard } from "@/ui/components/plp/product-card";
import type { ProductListItemFragment } from "@/gql/graphql";

export function RecentlyViewed({ channel }: { channel: string }) {
	const [products, setProducts] = useState<ProductListItemFragment[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;
		getRecentlyViewedProductsAction(channel)
			.then((data) => {
				if (active && data) {
					const validProducts = data.filter((p): p is ProductListItemFragment => !!p);
					setProducts(validProducts);
				}
				if (active) {
					setLoading(false);
				}
			})
			.catch((err) => {
				console.error("Failed to load recently viewed products:", err);
				if (active) {
					setLoading(false);
				}
			});
		return () => {
			active = false;
		};
	}, [channel]);

	if (loading) {
		return (
			<div className="mt-16 w-full animate-pulse border-t border-border pt-12">
				<div className="mb-6 h-7 w-48 rounded bg-secondary" />
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
					{[...Array(5)].map((_, i) => (
						<div key={i} className="space-y-4">
							<div className="aspect-[3/4] w-full rounded-xl bg-secondary" />
							<div className="h-4 w-3/4 rounded bg-secondary" />
							<div className="h-4 w-1/4 rounded bg-secondary" />
						</div>
					))}
				</div>
			</div>
		);
	}

	if (products.length === 0) {
		return null;
	}

	return (
		<section className="mt-16 border-t border-border pt-12">
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Recently Viewed</h2>
				<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					Your History
				</span>
			</div>

			<div className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				{products.map((product) => {
					const cardData = toProductCardData(product, channel);
					return (
						<div
							key={product.id}
							className="w-[180px] flex-shrink-0 snap-start transition-transform duration-300 hover:-translate-y-1 sm:w-[220px]"
						>
							<ProductCard product={cardData} />
						</div>
					);
				})}
			</div>
		</section>
	);
}

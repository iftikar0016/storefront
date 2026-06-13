"use client";

import { useEffect } from "react";
import { recordProductViewAction } from "@/app/actions";

export function RecentlyViewedTracker({ productId }: { productId: string }) {
	useEffect(() => {
		if (productId) {
			recordProductViewAction(productId).catch((err) => {
				console.error("Failed to record product view:", err);
			});
		}
	}, [productId]);

	return null;
}

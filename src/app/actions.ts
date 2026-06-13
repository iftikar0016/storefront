"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { signOutSession } from "@/lib/auth/bff-server";
import { revalidateStorefrontChrome } from "@/lib/auth/revalidate-storefront-chrome";
import { executeAuthenticatedGraphQL } from "@/lib/graphql";
import {
	CheckoutDeleteLinesDocument,
	CheckoutLinesUpdateDocument,
	RecordProductViewDocument,
	RecentlyViewedProductsDocument,
} from "@/gql/graphql";
import * as Checkout from "@/lib/checkout";

function revalidateCart(channel: string) {
	revalidatePath(`/${channel}/cart`);
	revalidateStorefrontChrome(channel);
}

/** Invalidate cached storefront chrome (header + checkout shell). Server actions only — not during RSC render. */
export async function revalidateStorefrontChromeAction(channel: string) {
	revalidateStorefrontChrome(channel);
}

export async function logout() {
	"use server";
	const cookieStore = await cookies();

	for (const cookie of cookieStore.getAll()) {
		if (!cookie.name.startsWith("checkoutId-") || !cookie.value) {
			continue;
		}
		await Checkout.detachCustomer(cookie.value);
	}

	await signOutSession();
	revalidatePath("/", "layout");
	revalidatePath("/checkout");
}

export async function saveCheckoutId(channel: string, checkoutId: string) {
	await Checkout.saveIdToCookie(channel, checkoutId);
}

/**
 * Clear the checkout cookie after a successful order.
 * Call after checkoutComplete succeeds — typically after navigating to order confirmation.
 * Never revalidates `/checkout` (that remounts the flow and resets the step mid-payment).
 */
export async function clearCheckout(channel: string) {
	"use server";
	await Checkout.clearCheckoutCookie(channel);
	revalidatePath(`/${channel}/cart`);
	revalidatePath(`/${channel}`, "layout");
}

export async function deleteCartLine(checkoutId: string, lineId: string, channel: string) {
	const result = await executeAuthenticatedGraphQL(CheckoutDeleteLinesDocument, {
		variables: {
			checkoutId,
			lineIds: [lineId],
		},
		cache: "no-cache",
	});

	if (result.ok) {
		const checkout = result.data.checkoutLinesDelete?.checkout;
		if (checkout && checkout.lines.length === 0) {
			await Checkout.clearCheckoutCookie(checkout.channel.slug);
		}
	}

	revalidateCart(channel);
}

export async function updateCartLineQuantity(
	checkoutId: string,
	lineId: string,
	quantity: number,
	channel: string,
) {
	if (quantity < 1) {
		return deleteCartLine(checkoutId, lineId, channel);
	}

	await executeAuthenticatedGraphQL(CheckoutLinesUpdateDocument, {
		variables: {
			checkoutId,
			lines: [{ lineId, quantity }],
		},
		cache: "no-cache",
	});

	revalidateCart(channel);
}

export async function recordProductViewAction(productId: string) {
	const cookieStore = await cookies();
	let sessionKey = cookieStore.get("saleor_recently_viewed_session")?.value;

	if (!sessionKey) {
		sessionKey = crypto.randomUUID();
		cookieStore.set("saleor_recently_viewed_session", sessionKey, {
			path: "/",
			maxAge: 60 * 60 * 24 * 30, // 30 days
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
		});
	}

	const result = await executeAuthenticatedGraphQL(RecordProductViewDocument, {
		variables: {
			id: productId,
			sessionKey,
		},
		cache: "no-cache",
	});

	return result.ok;
}

export async function getRecentlyViewedProductsAction(channel: string) {
	const cookieStore = await cookies();
	const sessionKey = cookieStore.get("saleor_recently_viewed_session")?.value;

	if (!sessionKey) {
		return [];
	}

	const result = await executeAuthenticatedGraphQL(RecentlyViewedProductsDocument, {
		variables: {
			sessionKey,
			channel,
		},
		cache: "no-cache",
	});

	if (!result.ok) {
		return [];
	}

	return result.data.recentlyViewedProducts;
}

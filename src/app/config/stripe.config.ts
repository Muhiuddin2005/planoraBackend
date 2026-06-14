import Stripe from "stripe";

// Ensure you have STRIPE_SECRET_KEY in your .env file
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string || "sk_test_placeholder", {
    apiVersion: "2026-04-22.dahlia",
});

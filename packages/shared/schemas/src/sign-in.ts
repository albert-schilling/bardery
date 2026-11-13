/**
 * How long a sign-in code works. The api gives codes this lifetime, and the web app shows when one
 * stops working. Long enough for an email that a receiving server holds back for a few minutes;
 * guessing is bounded by the attempts per code and the codes per hour, not by this.
 */
export const signInCodeLifetimeMinutes = 15;

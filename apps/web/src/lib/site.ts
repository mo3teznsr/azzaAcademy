/** The public web address, for absolute links in metadata, the sitemap and structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://azza.academy').replace(/\/$/, '');

/** A JSON-LD object as a string that is safe inside a <script> tag. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');

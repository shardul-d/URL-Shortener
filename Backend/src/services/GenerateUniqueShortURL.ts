import { nanoid } from 'nanoid';
import { client } from '../server.js';

export default async function generateUniqueShortURL() {
  let shortUrl: string;
  let existingUrl: { short_url: string } | null;
  do {
    shortUrl = nanoid(7);

    existingUrl = await client.urls.findUnique({
      where: { short_url: shortUrl },
      select: { short_url: true },
    });
  } while (existingUrl);

  return shortUrl;
}

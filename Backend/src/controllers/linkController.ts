import type { Request, Response } from 'express';
import {
  DeleteLinkInputSchema,
  GetLinkStatsByCountryInputSchema,
  GetLinkStatsByCountryResponseSchema,
  ShortenLinkInputSchema,
  UpdateLinkInputBodySchema,
  UpdateLinkInputParamsSchema,
  type ShortenLinkResponse,
} from '../../../lib/src/index.js';
import { client } from '../server.js';
import generateUniqueShortURL from '../services/GenerateUniqueShortURL.js';
import { countryCodeToName } from '../utils/CountryCodeToCountryName.js';
//To shorten incoming long URL
async function handleShortenLink(req: Request, res: Response): Promise<void> {
  //1. Shorten link using nanoid, SKIP if custom link provided.
  //2. Store short_url, owner_id, original_url, created_at, expires_at in 'urls'
  //3. Return short_url

  const inputs = ShortenLinkInputSchema.safeParse(req.body);
  if (!inputs.success) {
    res.status(400).json({ error: inputs.error.issues });
    console.log(inputs.error);
    return;
  }

  if (!inputs.data.short_url) {
    inputs.data.short_url = await generateUniqueShortURL();
  }

  try {
    await client.urls.create({
      data: {
        short_url: inputs.data.short_url,
        original_url: inputs.data.original_url,
        owner_id: req.userId,
        created_at: new Date(),
        expires_at: inputs.data.expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    const response: ShortenLinkResponse = { short_url: inputs.data.short_url };
    res.status(201).json(response);
  } catch (error) {
    // Handle non-unique short_url + TOCTTOU race condition
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      res.status(409).json({ error: 'Short URL already exists' });
      return;
    }
    throw error;
  }
}

//Get all links created by a user
async function handleGetUserLinks(req: Request, res: Response): Promise<void> {
  //1. Query 'urls' for all links where owner_id = user_id
  //2. Return short_url, original_url, alias, expires_at

  const clicksByCountry = await client.urls.findMany({
    where: { owner_id: req.userId },
    select: {
      short_url: true,
      original_url: true,
      alias: true,
      expires_at: true,
    },
  });

  res.status(200).json(clicksByCountry);
}

//Get stats of a specific link.
async function handleGetLinkStatsByCountry(req: Request, res: Response): Promise<void> {
  //1. Query 'clicks' for getting aggregated click count by country
  //2. Return aggregate counts.

  const inputs = GetLinkStatsByCountryInputSchema.safeParse(req.params);
  if (!inputs.success) {
    res.status(400).json({ error: inputs.error.issues });
    return;
  }
  const urlRecord = await client.urls.findFirst({
    where: {
      short_url: inputs.data.short_url,
      owner_id: req.userId, // ✅ Direct ownership check
    },
    select: { short_url: true }, // We just need to verify it exists
  });

  if (!urlRecord) {
    res.status(404).json({ error: 'Short URL not found or access denied' });
    return;
  }

  const clicksByCountry = await client.clicks.groupBy({
    by: ['country_code'],
    where: { short_url: inputs.data.short_url },
    _count: {
      country_code: true,
    },
    orderBy: {
      _count: {
        country_code: 'desc',
      },
    },
  });

  const clicksByCountryTransformed = clicksByCountry.map((row) => ({
    countryName: countryCodeToName(row.country_code) || 'Unknown',
    clicks: row._count.country_code,
  }));

  const result = GetLinkStatsByCountryResponseSchema.parse(clicksByCountryTransformed);

  res.status(200).json(result);
}

async function handleUpdateLink(req: Request, res: Response): Promise<void> {
  //1. Change original_url corresponding to given short_url in 'urls'
  //2. Acknowledge success.

  const params = UpdateLinkInputParamsSchema.safeParse(req.params);
  const body = UpdateLinkInputBodySchema.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.issues });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.issues });
    return;
  }

  try {
    await client.urls.update({
      where: {
        short_url: params.data.short_url,
        owner_id: req.userId,
      },
      data: {
        original_url: body.data.original_url,
      },
    });

    res.status(200).json({ message: 'URL updated successfully' });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      res.status(404).json({ error: 'Short URL not found for updation of long URL' });
    } else {
      throw error;
    }
  }
}

async function handleDeleteLink(req: Request, res: Response): Promise<void> {
  //1. Delete given short_url from 'urls'
  //2. Acknowledge success

  const inputs = DeleteLinkInputSchema.safeParse(req.params);
  if (!inputs.success) {
    res.status(400).json({ error: inputs.error.issues });
    return;
  }

  try {
    await client.urls.delete({
      where: {
        short_url: inputs.data.short_url,
        owner_id: req.userId,
      },
    });

    res.status(200).json({ message: 'Short URL deleted successfully' });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      res.status(404).json({ error: 'Short URL not found' });
    } else {
      throw error;
    }
  }
}

export {
  handleDeleteLink,
  handleGetLinkStatsByCountry,
  handleGetUserLinks,
  handleShortenLink,
  handleUpdateLink,
};

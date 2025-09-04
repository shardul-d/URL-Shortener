import type { Request, Response } from 'express';
import { RedirectParamsSchema } from '../../../lib/src/index.js';
import { client, geoService } from '../server.js';

async function handleRedirect(req: Request, res: Response) {
  const inputs = RedirectParamsSchema.safeParse(req.params);
  if (!inputs.success) {
    res.status(400).json({ error: inputs.error.issues });
    return;
  }

  const redirectTo = await client.urls.findUnique({
    where: { short_url: inputs.data.short_url },
    select: { original_url: true },
  });

  if (!redirectTo) {
    res.status(404).json({ message: 'URL not found.' });
    return;
  }

  res.redirect(302, redirectTo.original_url);

  await client.clicks.create({
    data: {
      short_url: inputs.data.short_url,
      click_time: new Date(),
      country_code: geoService.getCountryCode(req.ip),
    },
  });
}

export { handleRedirect };

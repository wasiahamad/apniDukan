/**
 * City Controller
 * Handles city-related endpoints
 */

import { getCityImage } from '../services/cityImageService.js';

/**
 * Get city image
 * GET /api/cities/:cityName/image
 */
export async function getCityImageEndpoint(req, res) {
  try {
    const { cityName } = req.params;

    if (!cityName) {
      return res.status(400).json({
        success: false,
        message: 'City name is required',
      });
    }

    const imageUrl = await getCityImage(cityName);

    res.json({
      success: true,
      data: {
        cityName,
        imageUrl,
      },
    });
  } catch (error) {
    console.error('Error getting city image:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching city image',
      error: error.message,
    });
  }
}

/**
 * Get city images batch
 * POST /api/cities/images/batch
 */
export async function getCityImagesBatch(req, res) {
  try {
    const { cities } = req.body;

    if (!Array.isArray(cities) || cities.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cities array is required',
      });
    }

    const images = await Promise.all(
      cities.map(async (cityName) => ({
        cityName,
        imageUrl: await getCityImage(cityName),
      }))
    );

    res.json({
      success: true,
      data: images,
    });
  } catch (error) {
    console.error('Error getting city images batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching city images',
      error: error.message,
    });
  }
}

import { functions } from '../firebase/firebase-config.js';
import { getAppConfig } from '../settings/main-config.js';
import { showToast } from '../utils/toast.js';

/**
 * File ko Cloudinary par seedha upload karta hai.
 * Yeh pehle backend se ek secure signature leta hai.
 * @param {File} file - User dwara select ki gayi image file.
 * @param {object} params - Upload ke liye extra parameters, jaise folder ya tags.
 *   Example: { folder: 'mstore/items/ITM-12345' }
 * @param {string} [resource_type='image'] - Upload kiye ja rahe resource ka prakar ('image', 'video', 'raw').
 * @returns {Promise<object|null>} Success par { public_id, secure_url }, fail par null.
 */
export async function uploadToCloudinary(file, params = {}, resource_type = 'image') {
  console.log("Requesting Cloudinary signature from backend...");

  try {
    // 1. Backend (Cloud Function) se signature generate karwayein.
    const getSignature = functions.httpsCallable('generateCloudinarySignature');
    const response = await getSignature({ params, resource_type });

    const { signature, timestamp, api_key, cloud_name } = response.data;
    console.log("✅ Signature received.");

    // 2. FormData object banayein jise Cloudinary ko bhejna hai.
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', api_key);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    // Frontend se bheje gaye sabhi extra parameters (jaise folder) ko bhi add karein.
    for (const key in params) {
      formData.append(key, params[key]);
    }

    // 3. Image ko સીધા Cloudinary par upload karein.
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/${resource_type}/upload`;

    console.log("Uploading file directly to Cloudinary...");
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(`Cloudinary upload failed: ${errorData.error.message}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log("✅ File uploaded successfully:", uploadResult);

    // 4. Sirf zaroori data (public_id aur secure_url) return karein.
    return {
      public_id: uploadResult.public_id,
      secure_url: uploadResult.secure_url,
    };

  } catch (error) {
    console.error("❌ Error in uploadToCloudinary process:", error);
    showToast('error', 'Image upload failed. Please try again.');
    return null;
  }
}

/**
 * Diye gaye public_id aur options se ek Cloudinary media URL banata hai.
 * @param {string} publicId - Cloudinary mein image ka public_id.
 * @param {object} [options={}] - Transformations ke liye options (e.g., { width: 300, crop: 'scale' }).
 * @param {string} [resource_type='image'] - Resource ka prakar ('image', 'video').
 * @returns {string} Poora image URL.
 */
export function buildCloudinaryUrl(publicId, options = {}, resource_type = 'image') {
  // Get the cloud name dynamically from the application config.
  const appConfig = getAppConfig();
  const cloudName = appConfig?.cloudinary?.cloud_name;
  const baseUrl = appConfig?.cloudinary?.base_url || 'https://res.cloudinary.com';

  if (!cloudName) {
    console.error("Cloudinary cloud_name is not configured in config.json. Cannot build media URL.");
    return './localstore/images/default-product.jpg'; // Fallback if cloud name is missing
  }

  if (!publicId) {
    // Agar publicId nahi hai, to ek default placeholder image return karein.
    return './localstore/images/default-product.jpg';
  }

  // Options object ko Cloudinary URL transformation string mein convert karein.
  // Example: { width: 300, crop: 'scale', quality: 'auto' } => "w_300,c_scale,q_auto"
  // Video ke liye: { width: 300, crop: 'scale', quality: 'auto', format: 'mp4' } => "w_300,c_scale,q_auto,f_mp4"
  const transformations = Object.entries(options)
    .map(([key, value]) => {
      // Cloudinary ke short-forms ka use karein (width -> w, height -> h, etc.)
      const paramMap = { width: 'w', height: 'h', crop: 'c', quality: 'q', format: 'f' };
      const shortKey = paramMap[key] || key;
      return `${shortKey}_${value}`;
    })
    .join(',');

  const urlParts = [baseUrl, cloudName, resource_type, 'upload'];

  // Agar transformations hain, to unhe URL mein add karein.
  if (transformations) {
    urlParts.push(transformations);
  }

  urlParts.push(publicId);

  // Bina transformations ke URL.
  return urlParts.join('/');
}
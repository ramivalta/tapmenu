"use server";

import { promises as fs } from 'fs';


import { put } from '@vercel/blob';
import { revalidatePath } from 'next/cache';

// export async function Form() {
//   async function uploadImage(formData: FormData) {
//     'use server';
//     const imageFile = formData.get('image') as File;
//     const blob = await put(imageFile.name, imageFile, {
//       access: 'public',
//     });
//     revalidatePath('/');
//     return blob;
//   }

//   return (
//     <form action={uploadImage}>
//       <label htmlFor="image">Image</label>
//       <input type="file" id="image" name="image" required />
//       <button>Upload</button>
//     </form>
//   );
// }

const saveTapConfigAction = async (queryParams: string, password: string | null) => {
    console.log("BASSWORD", password, process.env.PASSWORD);
    if (!password || password !== process.env.PASSWORD) {
        throw new Error('Invalid password');
    }

    await put("tapmenu/defaultTapConfig.json", queryParams, {
        access: 'public',
    });
    revalidatePath('/');

    return "Tap config saved";


    // try {
    //     console.log("LETS WRITE", queryParams);
    //     await fs.writeFile('/tmp/defaultTapConfig.json', queryParams);
    //     console.log('Tap configuration saved successfully.')
    //     return 'Tap configuration saved successfully.';
    // } catch (error) {
    //     console.error('Error saving tap configuration:', error);
    //     throw error; // Rethrow the error for further handling if necessary
    // }
};

export default saveTapConfigAction;
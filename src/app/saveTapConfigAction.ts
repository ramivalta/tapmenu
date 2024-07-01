"use server";

import { promises as fs } from 'fs';

const saveTapConfigAction = async (queryParams: string, password: string | null) => {
    console.log("BASSWORD", password, process.env.PASSWORD);
    if (!password || password !== process.env.PASSWORD) {
        throw new Error('Invalid password');
    }
    console.log("PASSWORD OK, PARAMS:", queryParams);
    try {
        console.log("LETS WRITE", queryParams);
        await fs.writeFile('./defaultTapConfig.json', queryParams);
        return 'Tap configuration saved successfully.';
    } catch (error) {
        console.error('Error saving tap configuration:', error);
        throw error; // Rethrow the error for further handling if necessary
    }
};

export default saveTapConfigAction;
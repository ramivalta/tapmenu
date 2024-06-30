"use server";

const generateShortUrlAction = async (url: string) => {
    const shortUrlResponse = await fetch("https://smolurl.com/api/links", {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            url
        })
    });

    const data = await shortUrlResponse.json();
    return data?.data?.short_url;
};

export default generateShortUrlAction;
const textToSpeech = async () => {
  const res = await fetch(
    "https://texttospeech.googleapis.com/v1/text:synthesize",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`,
      },
      body: "test",
    }
  );
  console.log(res);
};

textToSpeech();

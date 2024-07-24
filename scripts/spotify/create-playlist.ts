import axios from "axios";
import express from "express";
import open from "open";
import path from "path";
import ProgressBar from "progress";

interface Tokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  timestamp: number;
}

const tokenFilePath = path.join(__dirname, ".spotify_tokens.json");

// Replace these
const playlistName = "A Musical Journey Through Human Civilization";

const tracks = [
  "Carmina Burana: O Fortuna - Carl Orff",
  "Beethoven's Symphony No. 9 in D Minor, Op. 125 'Ode to Joy': IV. Finale - Ludwig van Beethoven",
  "Boléro - Maurice Ravel",
  "Nessun Dorma - Giacomo Puccini",
  "Gamelan Gong Kebyar - Traditional Balinese",
  "Raga Jog - Ravi Shankar",
  "The Blue Danube - Johann Strauss II",
  "Swan Lake Suite, Op. 20: Scene - Pyotr Ilyich Tchaikovsky",
  "Adagio for Strings, Op. 11 - Samuel Barber",
  "Mbube (The Lion Sleeps Tonight) - Solomon Linda",
  "Sakura - Traditional Japanese",
  "A La Nanita Nana - Traditional Spanish",
  "Funeral Song - Traditional Native American",
  "Greensleeves - Traditional English",
  "Kaval Sviri - Traditional Bulgarian",
  "Toccata and Fugue in D Minor, BWV 565 - Johann Sebastian Bach",
  "Adhan (Call to Prayer) - Traditional Islamic",
  "Amazing Grace - Traditional",
  "La Vie en Rose - Édith Piaf",
  "Hallelujah Chorus from Messiah - George Frideric Handel",
  "Kalinka - Traditional Russian",
  "Arirang - Traditional Korean",
  "Jalisco - Mariachi Vargas de Tecalitlán",
  "Nkosi Sikelel' iAfrika - Traditional South African",
  "Va Pensiero from Nabucco - Giuseppe Verdi",
  "This Land Is Your Land - Woody Guthrie",
  "Imagine - John Lennon",
  "One Love - Bob Marley & The Wailers",
  "What a Wonderful World - Louis Armstrong",
  "Bohemian Rhapsody - Queen",
];

const description =
  "Embark on a musical journey through the entirety of human civilization. This playlist features music from various cultures, time periods, and genres, reflecting the diversity and richness of human history. Enjoy traditional songs, classical masterpieces, and modern pieces that capture significant cultural and historical milestones.";

async function storeTokens(tokens: Tokens) {
  await Bun.write(tokenFilePath, JSON.stringify(tokens, null, 2));
}

async function getStoredTokens(): Promise<Tokens | null> {
  try {
    const data = await Bun.file(tokenFilePath).json();
    return data as Tokens;
  } catch {
    return null;
  }
}

const redirectUri = "http://localhost:3000/auth/callback";
const scopes = ["playlist-modify-public", "playlist-modify-private"];

async function refreshToken(refreshToken: string) {
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.clientId!,
        client_secret: process.env.clientSecret!,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const newTokens = {
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in,
      refresh_token: response.data.refresh_token || refreshToken, // Use the old refresh token if a new one is not provided
      scope: response.data.scope,
      timestamp: Date.now(),
    };

    await storeTokens(newTokens);
    return newTokens;
  } catch (error) {
    console.error("Error refreshing token:", error);
    throw error;
  }
}

async function getAccessToken(): Promise<string> {
  let tokens = await getStoredTokens();

  if (tokens) {
    const now = new Date();
    const expirationTime = new Date(
      tokens.timestamp + tokens.expires_in * 1000
    );

    if (now < expirationTime) {
      return tokens.access_token;
    } else {
      tokens = await refreshToken(tokens.refresh_token);
      return tokens.access_token;
    }
  } else {
    throw new Error("No valid tokens available.");
  }
}

async function authorize() {
  const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams(
    {
      response_type: "code",
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      scope: scopes.join(" "),
      redirect_uri: redirectUri,
    }
  )}`;

  open(authUrl);

  const app = express();

  app.get("/auth/callback", async (req, res) => {
    const code = req.query.code as string;
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
        client_id: process.env.SPOTIFY_CLIENT_ID!,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const tokens = {
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in,
      refresh_token: response.data.refresh_token,
      scope: response.data.scope,
      timestamp: Date.now(),
    };

    await storeTokens(tokens);
    res.send(
      "Authorization successful! You can close this tab and return to the console."
    );
    console.log("Authorization successful!");
    process.exit();
  });

  try {
    app.listen(3000, () => {
      console.log("Server is running on http://localhost:3000");
    });
  } catch (error) {
    console.error("Error starting server:", error);
  }
}

async function main() {
  try {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      throw new Error("Client ID and client secret are required");
    }
    const accessToken = await getAccessToken();

    const user = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const userId = user.data.id;

    const trackUris: string[] = [];
    const searchBar = new ProgressBar(
      "Searching tracks [:bar] :current/:total",
      {
        total: tracks.length,
        width: 40,
      }
    );

    // get track uris for each track
    await Promise.all(
      tracks.map(async (track, index) => {
        const uri = await searchTracks(accessToken, track);
        trackUris[index] = uri;
        searchBar.tick(); // Update progress bar
      })
    );

    try {
      const playlistId = await createPlaylist(accessToken, userId);

      console.log("Adding tracks to playlist");

      await addTracksToPlaylist(accessToken, playlistId, trackUris);
      console.log(`Playlist "${playlistName}" created successfully!`);
    } catch (error) {
      console.error(
        "Failed to create playlist:",
        (error as { response: { data: string } })?.response.data
      );
    }
  } catch (error) {
    console.log("No valid tokens available, starting authorization...");
    await authorize();
  }
}

async function searchTracks(
  accessToken: string,
  query: string
): Promise<string> {
  const response = await axios.get(`https://api.spotify.com/v1/search`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      q: query,
      type: "track",
      limit: 1,
    },
  });

  return response.data.tracks.items[0].uri;
}

async function createPlaylist(
  accessToken: string,
  userId: string
): Promise<string> {
  const response = await axios.post(
    `https://api.spotify.com/v1/users/${userId}/playlists`,
    JSON.stringify({
      name: playlistName,
      description,
      public: false,
    }),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.id;
}

async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
): Promise<void> {
  await axios.post(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    {
      uris: trackUris,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
}

main();

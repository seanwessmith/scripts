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

const playlistName = "Threads of Introspection";

const tracks = [
  "Motion Sickness - Phoebe Bridgers",
  "First Defeat - Noah Gundersen",
  "The Stable Song - Gregory Alan Isakov",
  "Lost in My Mind - The Head and the Heart",
  "Evelyn - Gregory Alan Isakov",
  "I Can't Go On Without You - Kaleo",
  "Blood - The Middle East",
  "Slow Dancing in a Burning Room - John Mayer",
  "Ghost Towns - Radical Face",
  "After Rain - Dermot Kennedy",
  "Georgia - Vance Joy",
  "Angeline - John Craigie",
  "Canyon Moon - Andrew McMahon in the Wilderness",
  "Mykonos - Fleet Foxes",
  "Blood Bank - Bon Iver",
  "Stubborn Love - The Lumineers",
  "Blue Skies - Noah and the Whale",
  "Heartbeats - José González",
  "Holocene - Bon Iver",
  "Sons & Daughters - The Decemberists",
];

const description =
  "A collection of introspective tracks that delve into themes of self-reflection and emotional turmoil, echoing the essence of 'Haven't Had My Shit Together' by Paul Moody and The Restless Age.";

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
    if (error instanceof Error) {
      console.error(error.message);
    }
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


const API_URL = "http://localhost:5000/api";

// Get installed models
export const getModels = async () => {
  const response = await fetch(`${API_URL}/models`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Unable to load models");
  }

  return data.models;
};

// Send message and receive streaming response
export const sendMessage = async (
  messages,
  model,
  onChunk
) => {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      model,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new Error(error.error || "Chat request failed");
  }

  if (!response.body) {
    throw new Error("Streaming is not supported by this response");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";

  const processEvent = (event) => {
    const lines = event.split("\n");

    const dataLines = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());

    if (!dataLines.length) return false;

    const data = dataLines.join("\n");

    if (data === "[DONE]") {
      return true;
    }

    let parsed;

    try {
      parsed = JSON.parse(data);
    } catch {
      throw new Error("Invalid streaming response from server");
    }

    if (parsed.error) {
      throw new Error(parsed.error);
    }

    if (parsed.content) {
      onChunk(parsed.content);
    }

    return false;
  };

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Handle both LF and CRLF line endings
    buffer = buffer.replace(/\r\n/g, "\n");

    let separatorIndex;

    while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
      const event = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      const finished = processEvent(event);

      if (finished) {
        await reader.cancel();
        return;
      }
    }
  }

  buffer += decoder.decode();
  buffer = buffer.replace(/\r\n/g, "\n");

  if (buffer.trim()) {
    processEvent(buffer);
  }
};

export const warmupModel = async (model) => {
  const response = await fetch(`${API_URL}/warmup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Model loading failed");
  }

  return data;
};


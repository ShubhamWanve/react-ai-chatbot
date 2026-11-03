
import { useEffect, useState } from "react";
import {
  getModels,
  sendMessage,
} from "./services/chatService";
import "./App.css";

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [modelError, setModelError] = useState("");

  // Load locally installed models when app starts
  useEffect(() => {
    const loadModels = async () => {
      try {
        const data = await getModels();

        setModels(data);

        if (data.length > 0) {
          setSelectedModel(data[0].name);
        } else {
          setModelError(
            "No models found. Please download a model using Ollama."
          );
        }
      } catch (error) {
        setModelError(error.message);
      }
    };

    loadModels();
  }, []);

  const handleSend = async () => {
    const text = input.trim();

    if (
      !text ||
      loading ||
      !selectedModel
    ) {
      return;
    }

    const userMessage = {
      role: "user",
      content: text,
    };

    const updatedMessages = [
      ...messages,
      userMessage,
    ];

    // Add user message and empty AI message
    setMessages([
      ...updatedMessages,
      {
        role: "assistant",
        content: "",
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      await sendMessage(
        updatedMessages,
        selectedModel,
        (chunk) => {
          // Append each streamed chunk to the AI message
          setMessages((prev) =>
            prev.map((message, index) => {
              if (index === prev.length - 1) {
                return {
                  ...message,
                  content: message.content + chunk,
                };
              }

              return message;
            })
          );
        }
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((message, index) => {
          if (index === prev.length - 1) {
            return {
              ...message,
              content: `Error: ${error.message}`,
            };
          }

          return message;
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h2>My AI Assistant</h2>
          <span>Powered by Ollama</span>
        </div>

        <div className="model-selector">
          <label htmlFor="model">Model:</label>

          <select
            id="model"
            value={selectedModel}
            onChange={(event) =>
              setSelectedModel(event.target.value)
            }
            disabled={loading || models.length === 0}
          >
            {models.map((model) => (
              <option
                key={model.name}
                value={model.name}
              >
                {model.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="chat-container">
        {messages.length === 0 && (
          <div className="welcome">
            <h1>How can I help you?</h1>
            <p>Ask me anything to get started.</p>

            {modelError && (
              <p className="error-text">
                {modelError}
              </p>
            )}

            {!modelError && models.length === 0 && (
              <p>Loading available models...</p>
            )}
          </div>
        )}

        <div className="messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.role}`}
            >
              <strong>
                {message.role === "user" ? "You" : "AI"}
              </strong>

              <p>
                {message.content}

                {loading &&
                  message.role === "assistant" &&
                  index === messages.length - 1 && (
                    <span className="cursor">▋</span>
                  )}
              </p>
            </div>
          ))}

          {loading && (
            <div className="loading">
              AI is generating a response...
            </div>
          )}
        </div>
      </main>

      <footer className="input-container">
        <textarea
          value={input}
          onChange={(event) =>
            setInput(event.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          rows={2}
          disabled={loading || !selectedModel}
        />

        <button
          onClick={handleSend}
          disabled={
            loading ||
            !input.trim() ||
            !selectedModel
          }
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </footer>
    </div>
  );
}

export default App;

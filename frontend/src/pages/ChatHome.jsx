// ChatHome.jsx
import React, { useEffect, useState } from "react";
import { useProfile } from "../context/profileContext";
import axios from "axios";
import ChatMessages from "../components/Chat/ChatMessages";
import MessageInputForm from "../components/Chat/MessageInputForm";
import Nav from "../components/Chat/Nav";
import OnlineUsersList from "../components/Chat/OnlineUserList";
import TopBar from "../components/Chat/TopBar";
import { socketUrl } from "../apiConfig";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";

const ChatHome = () => {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { userDetails } = useProfile();
  const { isAuthenticated, checkAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const connectAndListen = () => {
      console.log('Attempting WebSocket connection to:', socketUrl);
      
      const ws = new WebSocket(socketUrl);
      
      ws.addEventListener("open", () => {
        console.log("WebSocket connected successfully");
        
        // Send initial auth token to identify user
        if (document.cookie) {
          const tokenString = document.cookie
            .split(';')
            .find(str => str.trim().startsWith('authToken='));
          
          if (tokenString) {
            const token = tokenString.split('=')[1];
            console.log('Sending auth token to WebSocket server');
            ws.send(JSON.stringify({ type: 'auth', token }));
          }
        }
      });

      ws.addEventListener("message", (event) => {
        console.log('Received WebSocket message:', event.data);
        handleMessage(event);
      });

      ws.addEventListener("close", (event) => {
        console.log("WebSocket disconnected", event.code, event.reason);
        console.log("Retrying connection in 2 seconds...");
        setTimeout(connectAndListen, 2000);
      });

      ws.addEventListener("error", (error) => {
        console.error("WebSocket error:", error);
      });

      setWs(ws);
    };

    // Only connect if user is authenticated
    if (isAuthenticated && userDetails?._id) {
      connectAndListen();
    }

    return () => {
      if (ws) {
        console.log('Closing WebSocket connection on component unmount');
        ws.close();
      }
    };
  }, [isAuthenticated, userDetails?._id]); // Reconnect only when auth status changes

  const handleMessage = (ev) => {
    const messageData = JSON.parse(ev.data);
    console.log('Processing WebSocket message:', messageData);
    
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      if (messageData.sender === selectedUserId) {
        setMessages((prev) => [...prev, { ...messageData }]);
      }
    } else if ("error" in messageData) {
      console.error('WebSocket error:', messageData.error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedUserId) {
        setMessages([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`/api/user/messages/${selectedUserId}`);
        setMessages(res.data);
      } catch (error) {
        console.error("Error fetching messages:", error);
        setError("Failed to fetch messages. Please try again.");
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedUserId]);

  useEffect(() => {
    axios.get("/api/user/people").then((res) => {
      // console.log(res.data);
      const offlinePeopleArr = res?.data
        .filter((p) => p._id !== userDetails?._id)
        .filter((p) => !onlinePeople[p._id]);

      const offlinePeopleWithAvatar = offlinePeopleArr.map((p) => ({
        ...p,
        avatarLink: p.avatarLink, // assuming avatarLink is a property of p
      }));

      setOfflinePeople(
        offlinePeopleWithAvatar.reduce((acc, p) => {
          acc[p._id] = p;
          return acc;
        }, {})
      );
    });
  }, [onlinePeople, userDetails]);

  useEffect(() => {
    const handleRealTimeMessage = (event) => {
      const messageData = JSON.parse(event.data);

      if ("text" in messageData) {
        setMessages((prev) => [...prev, { ...messageData }]);
      }
    };

    // Add event listener for real-time messages
    if (ws) {
      ws.addEventListener("message", handleRealTimeMessage);
    }

    return () => {
      // Remove the event listener when component unmounts
      if (ws) {
        ws.removeEventListener("message", handleRealTimeMessage);
      }
    };
  }, [ws, selectedUserId]);

  const showOnlinePeople = (peopleArray) => {
    const people = {};
    peopleArray.forEach(({ userId, username, avatarLink }) => {
      if (userId !== userDetails?._id) {
        people[userId] = {
          username,
          avatarLink, // include avatarLink for online users
        };
      }
    });

    setOnlinePeople(people);
  };

  const sendMessage = (ev) => {
    if (ev) ev.preventDefault();
    console.log("sending message");
    console.log(newMessage, selectedUserId);
    ws.send(JSON.stringify({ text: newMessage, recipient: selectedUserId }));
    setNewMessage("");
    setMessages((prev) => [
      ...prev,
      {
        text: newMessage,
        sender: userDetails._id,
        recipient: selectedUserId,
        _id: Date.now(),
      },
    ]);
  };

  useEffect(() => {
    checkAuth();
    if (!isAuthenticated) {
      navigate("/");
    }
  }, []);
  return (
    <div className="flex min-h-screen  bg-background ">
      <Nav />
      <OnlineUsersList
        onlinePeople={onlinePeople}
        selectedUserId={selectedUserId}
        setSelectedUserId={setSelectedUserId}
        offlinePeople={offlinePeople}
      />
      <section className="w-[71%] lg:w-[62%] relative pb-10">
        {selectedUserId && (
          <TopBar
            selectedUserId={selectedUserId}
            setSelectedUserId={setSelectedUserId}
            offlinePeople={offlinePeople}
            onlinePeople={onlinePeople}
          />
        )}

        {loading && <div className="text-center p-4">Loading messages...</div>}
        {error && <div className="text-red-500 text-center p-4">{error}</div>}

        <ChatMessages
          messages={messages}
          userDetails={userDetails}
          selectedUserId={selectedUserId}
        />
        <div className="absolute w-full bottom-0 flex justify-center items-center">
          <MessageInputForm
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            sendMessage={sendMessage}
            selectedUserId={selectedUserId}
          />
        </div>
      </section>
    </div>
  );
};

export default ChatHome;

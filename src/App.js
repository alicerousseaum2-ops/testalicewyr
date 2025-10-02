import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, setDoc, updateDoc, onSnapshot, getDoc } from "firebase/firestore";

export default function App() {
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [playerId] = useState(() => Math.random().toString(36).substring(7));
  const [roomRef, setRoomRef] = useState(null);

  const [gameStarted, setGameStarted] = useState(false);
  const [choice, setChoice] = useState(null);
  const [otherChoice, setOtherChoice] = useState(null);
  const [match, setMatch] = useState(false);
  const [round, setRound] = useState(0);
  const [teamScore, setTeamScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const allOptions = [
    ["Apollo bagels", "Leon's bagels"],
    ["Metro", "Ferry"],
    ["Museum", "Shopping"],
    ["MoMa", "Guggenheim"],
    ["Funny Face cookies", "Crumbl cookies"],
    ["Spa experience", "Cinema"],
    ["Hotel experience", "Party experience"],
    ["Chick-fil-A", "Shake Shack"],
    ["Chill", "Sail & Sunset"],
    ["Painting", "Photo"],
  ];

  const matchSound = new Audio(
    "https://www.soundjay.com/buttons/sounds/button-3.mp3"
  );

  // Listen to Firebase updates
  useEffect(() => {
    if (!roomRef) return;

    const unsub = onSnapshot(roomRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      setRound(data.round);
      setGameOver(data.gameOver);
      setGameWon(data.gameWon);

      const players = data.players || {};
      const myChoice = players[playerId]?.choice || null;
      const opponentEntry = Object.entries(players).find(
        ([id]) => id !== playerId
      );
      const opponentChoice = opponentEntry?.[1]?.choice || null;

      setChoice(myChoice);
      setOtherChoice(opponentChoice);

      // ✅ calculate team score (sum of all players' scores)
      const teamScoreTotal = Object.values(players).reduce(
        (sum, p) => sum + (p.score || 0),
        0
      );
      setTeamScore(teamScoreTotal);

      // Start game only if 2 players joined
      if (Object.keys(players).length >= 2) {
        setGameStarted(true);
      }

      if (myChoice && opponentChoice) {
        if (myChoice === opponentChoice) {
          setMatch(true);
          matchSound.play();
        } else {
          setMatch(false);
        }
        setWaiting(false);
      } else if (myChoice && !opponentChoice) {
        setWaiting(true);
      } else {
        setWaiting(false);
      }
    });

    return () => unsub();
  }, [playerId, roomRef]);

  const createOrJoinRoom = async () => {
    if (!roomId || !playerName) return;
    const ref = doc(db, "games", roomId);
    setRoomRef(ref);

    const docSnap = await getDoc(ref);
    if (!docSnap.exists()) {
      await setDoc(ref, {
        round: 0,
        gameOver: false,
        gameWon: false,
        players: {},
      });
    }
    await updateDoc(ref, {
      [`players.${playerId}`]: { name: playerName, choice: null, score: 0 },
    });
  };

  const handleChoice = async (option) => {
    if (gameOver || gameWon || !roomRef) return;

    const docSnap = await getDoc(roomRef);
    const players = docSnap.exists() ? docSnap.data().players || {} : {};
    const myScore = players[playerId]?.score || 0;

    setChoice(option);

    const opponentChoice = Object.entries(players).find(
      ([id]) => id !== playerId
    )?.[1]?.choice;
    let newScore = myScore;

    if (opponentChoice && opponentChoice === option) {
      newScore += 1;
      setMatch(true);
      matchSound.play();
    } else {
      setMatch(false);
    }

    await updateDoc(roomRef, {
      [`players.${playerId}`]: {
        name: playerName,
        choice: option,
        score: newScore,
      },
    });
  };

  const nextRound = async () => {
    if (!roomRef) return;
    const docSnap = await getDoc(roomRef);
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    const players = data.players || {};

    const bothAnswered = Object.values(players).every((p) => p.choice !== null);
    if (!bothAnswered) {
      setWaiting(true);
      return;
    }

    // Reset choices, keep scores
    const resetPlayers = {};
    Object.entries(players).forEach(([id, p]) => {
      resetPlayers[id] = { ...p, choice: null };
    });

    if (round + 1 >= allOptions.length) {
      // Game end
      const totalScore = Object.values(players).reduce(
        (sum, p) => sum + (p.score || 0),
        0
      );
      if (totalScore >= 5)
        await updateDoc(roomRef, { gameWon: true, players: resetPlayers });
      else await updateDoc(roomRef, { gameOver: true, players: resetPlayers });
      return;
    }

    await updateDoc(roomRef, { round: data.round + 1, players: resetPlayers });
    setChoice(null);
    setOtherChoice(null);
    setMatch(false);
    setWaiting(false);
  };

  const playAgain = async () => {
    if (!roomRef) return;
    await setDoc(roomRef, {
      round: 0,
      gameOver: false,
      gameWon: false,
      players: {},
    });
    setRound(0);
    setTeamScore(0);
    setChoice(null);
    setOtherChoice(null);
    setMatch(false);
    setGameOver(false);
    setGameWon(false);
    setWaiting(false);
    setGameStarted(false);
  };

  // --- Screens ---
  if (!roomRef || !gameStarted)
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "black",
          color: "white",
          padding: "2rem",
          fontFamily: "Arial",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "3rem", marginBottom: "2rem" }}>
          Would You Rather
        </h1>
        <input
          style={{
            padding: "1rem",
            borderRadius: "1rem",
            marginBottom: "1rem",
            textAlign: "center",
            fontSize: "1rem",
            width: "16rem",
          }}
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <input
          style={{
            padding: "1rem",
            borderRadius: "1rem",
            marginBottom: "1rem",
            textAlign: "center",
            fontSize: "1rem",
            width: "16rem",
          }}
          placeholder="Enter room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button
          style={{
            padding: "1rem 2rem",
            backgroundColor: "#9b5de5",
            color: "white",
            borderRadius: "1rem",
            fontWeight: "bold",
            fontSize: "1rem",
            cursor: "pointer",
          }}
          disabled={!playerName || !roomId}
          onClick={createOrJoinRoom}
        >
          Create / Join Room
        </button>

        {roomId && playerName && (
          <p style={{ fontSize: "1.2rem", marginTop: "1rem", color: "#ccc" }}>
            Waiting for another player to join room <strong>{roomId}</strong>...
          </p>
        )}
      </div>
    );

  if (gameOver)
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "black",
          color: "white",
          padding: "2rem",
          fontFamily: "Arial",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>Game Over!</h1>
        <p style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          Final Team Score: <strong>{teamScore}</strong>
        </p>
        <button
          style={{
            padding: "1rem 2rem",
            backgroundColor: "#9b5de5",
            color: "white",
            borderRadius: "1rem",
            fontWeight: "bold",
            fontSize: "1rem",
            cursor: "pointer",
          }}
          onClick={playAgain}
        >
          Play Again
        </button>
      </div>
    );

  if (gameWon)
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "black",
          color: "white",
          padding: "2rem",
          fontFamily: "Arial",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>
          It's a Match! ❤️
        </h1>
        <p style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          Final Team Score: <strong>{teamScore}</strong>
        </p>
        <button
          style={{
            padding: "1rem 2rem",
            backgroundColor: "#9b5de5",
            color: "white",
            borderRadius: "1rem",
            fontWeight: "bold",
            fontSize: "1rem",
            cursor: "pointer",
          }}
          onClick={playAgain}
        >
          Play Again
        </button>
      </div>
    );

  const currentOptions = allOptions[round];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "black",
        color: "white",
        padding: "2rem",
        fontFamily: "Arial",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "24rem", margin: "0 auto" }}>
        <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>
          Would You Rather?
        </h1>
        <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
          Player: <strong>{playerName}</strong>
        </p>
        <p style={{ fontSize: "1.5rem", marginBottom: "2rem" }}>
          Team Score: <strong>{teamScore}</strong>
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          {currentOptions.map((option) => (
            <button
              key={option}
              style={{
                padding: "1rem",
                backgroundColor: choice === option ? "#9b5de5" : "white",
                color: choice === option ? "white" : "black",
                fontSize: "1.2rem",
                fontWeight: "bold",
                borderRadius: "1rem",
                cursor: "pointer",
              }}
              onClick={() => handleChoice(option)}
              disabled={!!choice}
            >
              {option}
            </button>
          ))}
        </div>

        {waiting && (
          <p style={{ fontSize: "1.2rem", marginTop: "1rem", color: "#ccc" }}>
            Waiting for other player...
          </p>
        )}

        {choice && otherChoice && (
          <div style={{ marginTop: "1rem", marginBottom: "2rem" }}>
            <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
              You chose: <strong>{choice}</strong>
            </p>
            <p style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
              Other player chose: <strong>{otherChoice}</strong>
            </p>
            {match && (
              <div
                style={{
                  fontSize: "2rem",
                  marginBottom: "1.5rem",
                  color: "limegreen",
                }}
              >
                🎉 It's a Match!
              </div>
            )}
            <button
              style={{
                padding: "1rem 2rem",
                backgroundColor: "#9b5de5",
                color: "white",
                borderRadius: "1rem",
                fontWeight: "bold",
                fontSize: "1rem",
                cursor: "pointer",
              }}
              onClick={nextRound}
            >
              Next Round
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

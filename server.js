const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3000 });
let players = [];
let playerData = {}; // 플레이어 카드 및 베팅 정보 저장

wss.on("connection", function connection(ws) {
    if (players.length >= 2) {
        ws.send(JSON.stringify({ type: "error", message: "게임이 이미 진행 중입니다." }));
        ws.close();
        return;
    }

    players.push(ws);
    let playerIndex = players.length - 1;
    console.log(`플레이어 ${playerIndex + 1} 연결됨`);

    if (players.length === 1) {
        ws.send(JSON.stringify({ type: "waiting", message: "상대방을 기다리는 중..." }));
    } else if (players.length === 2) {
        players.forEach((player) => {
            if (player.readyState === WebSocket.OPEN) {
                player.send(JSON.stringify({ type: "readyToStart", message: "두 명이 접속했습니다! 게임을 시작하세요." }));
            }
        });
    }

    ws.on("message", function incoming(message) {
        const data = JSON.parse(message);

        if (data.type === "startGame" && players.length === 2) {
            console.log("게임 시작!");
            players.forEach((player) => {
                if (player.readyState === WebSocket.OPEN) {
                    player.send(JSON.stringify({ type: "gameStart", message: "게임이 시작되었습니다!" }));
                }
            });

            // 카드 지급
            players.forEach((player) => {
                let cards = [Math.floor(Math.random() * 13) + 1, Math.floor(Math.random() * 13) + 1];
                playerData[player] = { cards, bet: 0 };
                player.send(JSON.stringify({ type: "assignCards", cards }));
            });
        }

        if (data.type === "bet") {
            console.log(`플레이어 ${playerIndex + 1} 베팅: ${data.amount}`);
            playerData[ws].bet = data.amount;

            // 상대방에게 베팅 정보 전송
            players.forEach((player) => {
                if (player !== ws && player.readyState === WebSocket.OPEN) {
                    player.send(JSON.stringify({ type: "updateChips", chips: data.amount }));
                }
            });

            checkWinner();
        }
    });

    ws.on("close", function close() {
        players = players.filter(p => p !== ws);
        delete playerData[ws];
        console.log(`플레이어 ${playerIndex + 1} 연결 종료`);

        if (players.length === 0) {
            console.log("게임이 종료되었습니다. 방을 초기화합니다.");
        }
    });
});

// 두 명이 베팅 완료하면 승자 결정
function checkWinner() {
    if (players.length === 2 && playerData[players[0]].bet > 0 && playerData[players[1]].bet > 0) {
        let sum1 = playerData[players[0]].cards[0] + playerData[players[0]].cards[1];
        let sum2 = playerData[players[1]].cards[0] + playerData[players[1]].cards[1];

        let winner;
        if (sum1 > sum2) {
            winner = "플레이어 1 승리!";
        } else if (sum2 > sum1) {
            winner = "플레이어 2 승리!";
        } else {
            winner = "무승부!";
        }

        players.forEach((player) => {
            if (player.readyState === WebSocket.OPEN) {
                player.send(JSON.stringify({ type: "gameResult", message: winner }));
            }
        });

        console.log(winner);
    }
}

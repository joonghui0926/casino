const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3000 });
let players = [];
let playerData = {}; // 각 플레이어의 카드 및 베팅 정보 저장

wss.on("connection", function connection(ws) {
    if (players.length >= 2) {
        ws.send(JSON.stringify({ type: "error", message: "게임이 이미 진행 중입니다." }));
        ws.close();
        return;
    }

    let playerIndex = players.length;
    players.push(ws);
    console.log(`플레이어 ${playerIndex + 1} 연결됨`);

    let cards = [Math.floor(Math.random() * 13) + 1, Math.floor(Math.random() * 13) + 1];
    playerData[ws] = { cards, bet: 0 };

    ws.send(JSON.stringify({ type: "assignCards", cards }));

    if (players.length === 1) {
        ws.send(JSON.stringify({ type: "waiting", message: "상대방을 기다리는 중..." }));
    } else if (players.length === 2) {
        console.log("게임 시작!");
        startGame();
    }

    ws.on("message", function incoming(message) {
        const data = JSON.parse(message);

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
    });
});

// 게임 시작 함수
function startGame() {
    players.forEach((player) => {
        if (player.readyState === WebSocket.OPEN) {
            player.send(JSON.stringify({ type: "gameStart", message: "게임이 시작되었습니다!" }));
        }
    });
}

// 베팅이 완료되면 승자 판별
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

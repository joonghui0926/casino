const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3000 });
let players = [];

wss.on("connection", function connection(ws) {
    if (players.length >= 2) {
        ws.send(JSON.stringify({ type: "error", message: "게임이 이미 시작됨" }));
        ws.close();
        return;
    }

    players.push(ws);
    let playerIndex = players.length - 1;

    console.log(`플레이어 ${playerIndex + 1} 연결됨`);

    // 각 플레이어에게만 카드 정보 제공
    let cards = [Math.floor(Math.random() * 13) + 1, Math.floor(Math.random() * 13) + 1];
    ws.send(JSON.stringify({ type: "assignCards", cards })); // 자기한테만 카드 전송

    ws.on("message", function incoming(message) {
        const data = JSON.parse(message);

        if (data.type === "bet") {
            console.log(`플레이어 ${playerIndex + 1} 베팅: ${data.amount}`);

            // 상대방에게만 베팅 정보 전달
            players.forEach((player, index) => {
                if (index !== playerIndex && player.readyState === WebSocket.OPEN) {
                    player.send(JSON.stringify({ type: "updateChips", chips: data.amount }));
                }
            });
        }
    });

    ws.on("close", function close() {
        players = players.filter(p => p !== ws);
        console.log(`플레이어 ${playerIndex + 1} 연결 종료`);
    });
});

# Quiz / 変更点
イントロクイズボット

**変更点**
 - **__ログインに必要なトークンを設定する`.env`には、Base64を3重エンコードしたものを使用するようになります。__**
   - エンコードするには、`node encrypt.js <Botトークン>`を1回、`node encrypt.js <出てきたの>`を2回
   - セキュリティ的には弱すぎるので、時間稼ぎ。
 - Discordサーバーごとの設定ファイルが作成されるようになり、サーバーごとにプレフィックスを指定できるようになりました。
   - デフォルトは`q.`です。
   - 設定方法は`setprefix <プレフィックス>`です。
 - `messages.json`を使用してメッセージをまとめてます(下記の`string-format`も使用)。
 - 投票コマンドを作成。おまけ機能的な何か。

---
## 注意
__**このブランチはおそらく不安定です。**__(不安定性: master < beta < canary)

## 必要なnodeモジュール
 - `fs`
 - `node-mkdirp`
 - `string-format`

---
### コマンド
コマンド一覧です。__プレフィックスを除きます。__

| コマンド | 何をするか |
| -------- | ---------- |
| help | ヘルプを表示します。 |
| ping | Pingを表示します。 |
| connect | 送信したユーザーがいるボイスチャンネルに参加します。 |
| disconnect | ボイスチャンネルから切断します。 |
| quiz start <YouTube再生リスト> | 再生リストの動画でイントロクイズを開始します。 |
| quiz stop | イントロクイズを終了します。 |
| quiz end  | イントロクイズを終了します。 |
| setprefix <プレフィックス> | プレフィックスを設定します。 |
| vote <create\|start> <名前> 回答1\|回答2\|回答3\|...\|回答10 | 投票を作成します。 |
| vote <close\|end> <投票ID> | 投票を閉じます。作成した人だけができます。 |
| vote vote <投票ID> <投票する番号(1-10)> | 投票します。実は重大なバグがある。 |
| vote info <投票ID> | 現在の投票の状況を見ます。 |
| vote list | 投票一覧を表示します。 |

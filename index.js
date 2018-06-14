// |-----------------------------------------------------------------------------------------------------------|
// |  ____      _ ____            _ ____  _   _    __     ____            _   _            ____   _   __  __   |
// | |  _ \    | / ___|          | |  _ \| \ | |  | /    / ___\    /\    | \ | |    /\    |    \ \ \_/ /  \ |  |
// | | | | |_  | \___ \ _____ _  | | |_) |  \| |  ||    | /       /  \   |  \| |   /  \   | |__/  \   /    ||  |
// | | |_| | |_| |___) |_____| |_| |  __/| |\  |  ||    | \____  /----\  | |\  |  /----\  | |\ \   | |     ||  |
// | |____/ \___/|____/       \___/|_|   |_| \_|  |_\    \____/ /      \ |_| \_| /      \ |_| \_\  |_|    /_|  |
// |                                                                                                           |
// |-----------------------------------------------------------------------------------------------------------|
//
// GitHub Repository: https://github.com/DJS-JPN/IntroQuiz
//
// GitLab Repository: https://gitlab.com/DJS-JPN/IntroQuiz
//

const {"parsed": env} = require(`dotenv-safe`).config(),
  discord = require(`discord.js`),
  client = new discord.Client(),
  ytdl = require(`ytdl-core`),
  playlist = require(`./playlist`),
  StringBuffer = require(`node-stringbuilder`),
  {
    songReplace,
    songReplace2,
    songReplace3
  } = require(`./song_replace`),
  ypi = require(`youtube-playlist-info`),
  process = require(`process`),
  fs = require(`fs`),
  mkdirp = require(`node-mkdirp`),
  format = require(`string-format`),
  messages = require(`./messages.json`),
  defaultSettings = {
    "PREFIX": env.PREFIX
  };

let status = false,
  correct = false,
  songinfo = ``,
  connection = ``,
  dispatcher,
  timeout,
  channel,
  guildSettings,
  settings,
  songs;

client.on(`ready`, () => {
  console.log(messages.console.login_complete);
});

client.on(`message`, async (msg) => {
  if (!msg.guild) return;
  if (msg.author.bot || msg.system) return;
  if (!fs.existsSync(`./data/servers`)) {
    console.log(messages.console.creating_data_folder, `(設定)`);
    mkdirp(`./data/servers`);
  }
  if (!fs.existsSync(`./data/votes/${msg.guild.id}`)) {
    console.log(messages.console.creating_data_folder, `(投票)`);
    mkdirp(`./data/votes/${msg.guild.id}`);
  }
  guildSettings = `./data/servers/${msg.guild.id}.json`;
  if (!fs.existsSync(guildSettings)) {
    console.log(messages.console.creating_settingsfile, guildSettings);
    fs.writeFileSync(guildSettings, JSON.stringify(defaultSettings, null, 4), `utf8`, (err) => {
      if(err) {
        console.error(err);
      }
    });
  }
  settings = require(guildSettings);
  if (msg.content.startsWith(settings.PREFIX)) {
    console.log(`${msg.author.tag}がコマンドを送信しました: ${msg.content}`);
    const split = msg.content.replace(settings.PREFIX, ``).split(` `),
      command = split[0];
    if (typeof global[command] === `function`) {
      if (command === `nextquiz`) return;
      global[command](msg, split);
    } else {
      msg.channel.send(messages.no_command);
    }
  } else if (status) {
    const answera = songReplace(songinfo[1]),
       answerb = songReplace2(songinfo[1]), // pickup another answer
       answerc = songReplace3(songinfo[1]); // pickup another another answer (experimental)
    if (~msg.content.indexOf(answera) || ~msg.content.indexOf(answerb) || ~msg.content.indexOf(answerc)) {
      correct = true;
      msg.channel.send(format(messages.correct, songinfo[1], songinfo[0]));
      dispatcher.end();
    }
  }
});
global.ping = (msg, split) => {
  msg.channel.send(format(messages.pong, Math.floor(client.ping)));
};

global.help = (msg, split) => {
  const embed = new discord.RichEmbed().
    setTitle(`コマンド一覧`).
    setTimestamp().
    setFooter(`ヘルプコマンド(help)`).
    addField(`help`, `ヘルプを表示`).
    addField(`ping`, `ボットのPingを確認`).
    addField(`connect`, `ボイスチャンネルに接続`).
    addField(`disconnect`, `ボイスチャットから切断`).
    addField(`quiz start <YouTubeプレイリスト>`, `イントロクイズを開始`).
    addField(`quiz <end|stop>`, `イントロクイズを終了`);
  msg.channel.send(embed);
};

global.connect = (msg, split) => {
  if (msg.member.voiceChannel) {
    msg.member.voiceChannel.join().then((connection) =>
      msg.channel.send(format(messages.join_vc.success, msg.member.voiceChannel.name))
    ).catch((error) => {
      if (msg.member.voiceChannel.full) {
        msg.channel.send(format(messages.join_vc.full, msg.member.voiceChannel.name));
      } else if (!msg.member.voiceChannel.joinable) {
        msg.channel.send(format(messages.join_vc.no_permission, msg.member.voiceChannel.name));
      } else {
        msg.channel.send(format(messages.join_vc.unknown_error, msg.member.voiceChannel.name));
        console.error(format(messages.console.join_vc_error, error));
      }
    });
  } else {
    msg.channel.send(messages.join_vc.tryagain);
  }
};

global.vote = (msg, split) => {
  if (split[1] === `create` || split[1] === `start`) {
    if (!(/\|/gm).test(split[3])) return msg.channel.send(messages.votes.invalid_usage);
    if (split[3].split(`|`).length > 10) return msg.channel.send(format(messages.votes.too_many_args, split[3].split(`|`).length - 1));
    let voteId = Math.random().toString(36).substr(2, 5);
    const guildId = msg.guild.id;
    while (true) {
      if (fs.existsSync(`./data/votes/${guildId}/${voteId}.json`)) {
        voteId = Math.random().toString(36).substr(2, 5);
        continue;
      } else {
        break;
      }
    }
    const args = split[3].split(`|`),
      voteFile = `./data/votes/${guildId}/${voteId}.json`,
      voteData = {
      "title": `${split[2]}`,
      "data1": `${args[0]}`,
      "data2": `${args[1]}`,
      "data3": `${args[2]}`,
      "data4": `${args[3]}`,
      "data5": `${args[4]}`,
      "data6": `${args[5]}`,
      "data7": `${args[6]}`,
      "data8": `${args[7]}`,
      "data9": `${args[8]}`,
      "data10": `${args[9]}`,
      "closed": false,
      "votes1": 0,
      "votes2": 0,
      "votes3": 0,
      "votes4": 0,
      "votes5": 0,
      "votes6": 0,
      "votes7": 0,
      "votes8": 0,
      "votes9": 0,
      "votes10": 0,
      "creator": `${msg.author.id}`
    };
    fs.writeFileSync(voteFile, JSON.stringify(voteData, null, 4), `utf8`, (err) => {
  console.error(err);
});
   const vote = require(voteFile);
   msg.channel.send(`\`${voteId}\`を作成しました。\n投票には、\`${settings.PREFIX}vote vote <ID> <数値>\`を入力してください。`);
    const voteEmbed = new discord.RichEmbed().
      setTitle(`投票`).
      addField(vote.data1, vote.votes1).
      addField(vote.data2, vote.votes2).
      addField(vote.data3, vote.votes3).
      addField(vote.data4, vote.votes4).
      addField(vote.data5, vote.votes5).
      addField(vote.data6, vote.votes6).
      addField(vote.data7, vote.votes7).
      addField(vote.data8, vote.votes8).
      addField(vote.data9, vote.votes9).
      addField(vote.data10, vote.votes10).
      addField(`作成者`, vote.creator).
      setFooter(`閉じられているか: ${vote.closed}`);
    msg.channel.send(voteEmbed);
  } else if (split[1] === `close` || split[1] === `end`) {
    if (!split[2]) return msg.channel.send(messages.wrong_args);
    const voteId = split[2],
      guildId = msg.guild.id,
      voteFile = `./data/votes/${guildId}/${voteId}.json`;
    if (!fs.existsSync(voteFile)) return msg.channel.send(messages.votes.no_file);
    let vote = require(voteFile);
    if (vote.creator === msg.author.id) {
      vote.closed = true;
      writeSettings(voteFile, vote, msg.channel);
      vote = require(voteFile);
      msg.channel.send(messages.votes.close);
      const voteEmbed = new discord.RichEmbed().
        setTitle(`投票`).
        addField(vote.data1, vote.votes1).
        addField(vote.data2, vote.votes2).
        addField(vote.data3, vote.votes3).
        addField(vote.data4, vote.votes4).
        addField(vote.data5, vote.votes5).
        addField(vote.data6, vote.votes6).
        addField(vote.data7, vote.votes7).
        addField(vote.data8, vote.votes8).
        addField(vote.data9, vote.votes9).
        addField(vote.data10, vote.votes10).
        addField(`作成者`, vote.creator).
        setFooter(`閉じられているか: ${vote.closed}`);
      msg.channel.send(voteEmbed);
    } else {
      msg.channel.send(messages.no_permission);
    }
  } else if (split[1] === `vote`) {
    if (!split[3]) return msg.channel.send(`${messages.wrong_args}\n投票IDを指定してください。一覧は\`${settings.PREFIX}vote list\`で見れます。`);
    const voteId = split[2],
      guildId = msg.guild.id,
      voteFile = `./data/votes/${guildId}/${voteId}.json`;
    if (!fs.existsSync(voteFile)) return msg.channel.send(messages.votes.no_file);
    let vote = require(voteFile);
    if (vote[`closed`] === true) return msg.channel.send(messages.votes.closed);
    vote[`votes${split[3]}`] = ++vote[`votes${split[3]}`];
    writeSettings(voteFile, vote, msg.channel);
    vote = require(voteFile);
    msg.channel.send(messages.votes.voted);
    const voteEmbed = new discord.RichEmbed().
      setTitle(`投票`).
      addField(vote.data1, vote.votes1).
      addField(vote.data2, vote.votes2).
      addField(vote.data3, vote.votes3).
      addField(vote.data4, vote.votes4).
      addField(vote.data5, vote.votes5).
      addField(vote.data6, vote.votes6).
      addField(vote.data7, vote.votes7).
      addField(vote.data8, vote.votes8).
      addField(vote.data9, vote.votes9).
      addField(vote.data10, vote.votes10).
      addField(`作成者`, vote.creator).
      setFooter(`閉じられているか: ${vote.closed}`);
    msg.channel.send(voteEmbed);
  } else if (split[1] === `list`) {
    const embed = new discord.RichEmbed().
      setTitle(`投票ID一覧`).
      setTimestamp(),
      sb = new StringBuffer(``),
      items = fs.readdirSync(`./data/votes/${msg.guild.id}/`);
    for (let i = 0; i < items.length; i++) {
      sb.append(`${items[i].replace(`.json`, ``)}\n`);
    }
    sb.append(`Folder: ./data/votes/${msg.guild.id}/`);
    embed.setDescription(sb.toString());
    msg.channel.send(embed);
  } else if (split[1] === `info`) {
    if (!split[2]) return msg.channel.send(`${messages.wrong_args}\n投票IDを指定してください。一覧は\`${settings.PREFIX}vote list\`で見れます。`);
    const voteId = split[2],
      guildId = msg.guild.id,
      voteFile = `./data/votes/${guildId}/${voteId}.json`;
    if (!fs.existsSync(voteFile)) return msg.channel.send(messages.votes.no_file);
    const vote = require(voteFile);
    const voteEmbed = new discord.RichEmbed().
      setTimestamp().
      setTitle(`投票`).
      addField(vote.data1, vote.votes1).
      addField(vote.data2, vote.votes2).
      addField(vote.data3, vote.votes3).
      addField(vote.data4, vote.votes4).
      addField(vote.data5, vote.votes5).
      addField(vote.data6, vote.votes6).
      addField(vote.data7, vote.votes7).
      addField(vote.data8, vote.votes8).
      addField(vote.data9, vote.votes9).
      addField(vote.data10, vote.votes10).
      addField(`作成者`, client.users.get(vote.creator).toString()).
      setFooter(`閉じられているか: ${vote.closed} ・ 項目がundefinedになってるのはデータがありません。これには投票しないでください。`);
    msg.channel.send(voteEmbed);
  } else {
    msg.channel.send(messages.wrong_args);
  }
};

global.disconnect = (msg, split) => {
    client.clearTimeout(timeout);
    channel = null;
    if (status) {
      status = false;
      correct = false;
      dispatcher.end();
      connection.disconnect();
    }
    if (!msg.guild.me.voiceChannel) return msg.channel.send(messages.exit_vc_notjoined);
    msg.guild.me.voiceChannel.leave();
    msg.channel.send(format(messages.exit_vc, msg.guild.me.voiceChannel.name));
};

global.quiz = async (msg, split) => {
  if (split[1] === `start`) {
    if (status) return;
    if (msg.member.voiceChannel) {
      if (!split[2]) return msg.channel.send(messages.quiz.please_playlistid);
      split[2] = split[2].replace(/_/gm, `M`);
      console.log(`Argument2: ${split[2]}`);
      msg.channel.send(messages.quiz.loading);
      if (split[2].length === 0) {
        return msg.channel.send(`読み込めません。バグの可能性が高いです。引数[2]: ${split[2]}`);
      }
      if (split[2].length < 34) {
        return msg.channel.send(messages.quiz.not_enough_count);
      }
      split[2] = split[2].replace(`https://www.youtube.com/playlist?list=`, ``);
      if (~split[2].indexOf(`https://www.youtube.com/watch?v=`) && ~split[2].indexOf(`&list=`)) {
        split[2] = split[2].replace(`&list=`, ``);
        split[2] = split[2].replace(`https://www.youtube.com/watch?v=`, ``).slice(11);
        split[2] = split[2].replace(/&index=(\\.|[^&])*/gm, ``);
      }
      const list = await playlist(split[2]).
        catch((error) => {
          if (error === `Error: The request is not properly authorized to retrieve the specified playlist.`) {
            return msg.channel.send(messages.quiz.error.unavailable);
          } else if (error === `Error: The playlist identified with the requests <code>playlistId</code> parameter cannot be found.`) {
            return msg.channel.send(messages.quiz.error.notfound);
          } else if (error === `Error: Bad Request`) {
            return msg.channel.send(messages.quiz.error.badrequest);
          } else {
            return msg.channel.send(format(messages.quiz.error.unknown_error, error));
          }
        });
      if (!Array.isArray(list)) return msg.channel.send(list);
      songs = list.map((video) => [video.resourceId.videoId, video.title]);
      msg.member.voiceChannel.join().then((con) => {
        connection = con;
        status = true;
        nextquiz(msg);
      }).catch((error) => {
        if (msg.member.voiceChannel.full) {
          msg.channel.send(format(messages.join_vc.full, msg.member.voiceChannel.name));
        } else if (!msg.member.voiceChannel.joinable) {
          msg.channel.send(format(messages.join_vc.no_permission, msg.member.voiceChannel.name));
        } else {
          msg.channel.send(format(messages.join_vc.unknown_error, msg.member.voiceChannel.name));
          console.error(format(messages.console.join_vc_error, error));
        }
      });
    } else {
      msg.channel.send(messages.join_vc.tryagain);
    }
  } else if (split[1] === `end` || split[1] === `stop`) {
    if (status) {
      client.clearTimeout(timeout);
      channel = null;
      status = false;
      correct = false;
      dispatcher.end();
      connection.disconnect();
      msg.channel.send(messages.quiz.stop);
    } else {
      msg.channel.send(messages.quiz.not_started);
    }
  } else {
    msg.channel.send(messages.wrong_args);
  }
};

function nextquiz(msg, number = 0) {
  msg.channel.send(format(messages.quiz.nextquiz, ++number));
  correct = false;
  timeout = client.setTimeout(() => {
    msg.channel.send(messages.quiz.start);
    songinfo = songs[Math.floor(Math.random() * songs.length)];
    console.log(songinfo);
    const stream = ytdl(songinfo[0], {"filter": `audioonly`});
    dispatcher = connection.playStream(stream);
    dispatcher.on(`end`, (end) => {
      if (!correct)
        msg.channel.send(format(messages.quiz.uncorrect, songinfo[1], songinfo[0]));
      if (status) nextquiz(msg, number);
    });
  }, 5000);
}

global.test = (msg, split) => {
  msg.channel.send(`Extracted name: \`` + songReplace(msg.content.replace(settings.PREFIX + `test `, ``)) + `\``);
};

global.test2 = (msg, split) => {
  msg.channel.send(`Extracted name: \`` + songReplace2(msg.content.replace(settings.PREFIX + `test2 `, ``)) + `\``);
};

global.test3 = (msg, split) => {
  msg.channel.send(`Extracted name: \`` + songReplace3(msg.content.replace(settings.PREFIX + `test3 `, ``)) + `\``);
};

global.testmulti = (msg, split) => {
  const embed = new discord.RichEmbed().
    setTitle(`判定テスト`).
    addField(`1つ目の答え`, `\`` + songReplace(msg.content.replace(settings.PREFIX + `testmulti `, ``)) + `\``).
    addField(`2つ目の答え`, `\`` + songReplace2(msg.content.replace(settings.PREFIX + `testmulti `, ``)) + `\``).
    addField(`3つ目の答え`, `\`` + songReplace3(msg.content.replace(settings.PREFIX + `testmulti `, ``)) + `\``).
    setFooter(`元テキスト: \`` + msg.content + `\` / コマンド抜き: \`` + msg.content.replace(settings.PREFIX + `testmulti `, ``) + `\``);
  msg.channel.send(embed);
};

global.setprefix = (msg, split) => {
  if (!msg.member.hasPermission(8)) return msg.channel.send(messages.no_permission);
  const set = settings;
  if (/\s/gm.test(split[1]) || split[1] === null) {
    msg.channel.send(messages.cantsave_nospace);
  } else {
    set.PREFIX = split[1];
    writeSettings(guildSettings, set, msg.channel);
  }
};

function writeSettings(settingsFile, wsettings, channel) {
  fs.writeFileSync(settingsFile, JSON.stringify(wsettings, null, 4), `utf8`, (err) => {
 if(err) {
 console.error(err);
}
});
  channel.send(messages.saved_settings);
}

process.on(`SIGINT`, () => {
  console.error(`SIGINTを検知しました。`);
  console.error(`シャットダウン中...`);
  client.destroy();
});

client.login(Buffer.from(Buffer.from(Buffer.from(env.TOKEN, `base64`).toString(`ascii`), `base64`).toString(`ascii`), `base64`).toString(`ascii`));

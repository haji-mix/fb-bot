"use strict";
var utils = require("../utils");
var log = require("npmlog");
var mqtt = require('mqtt');
var websocket = require('websocket-stream');
var HttpsProxyAgent = require('https-proxy-agent');
const EventEmitter = require('events');

var identity = function () {};
var form = {};
var getSeqID = function () {};

var topics = [
  "/legacy_web",
  "/webrtc",
  "/rtc_multi",
  "/onevc",
  "/br_sr",
  "/sr_res",
  "/t_ms",
  "/thread_typing",
  "/orca_typing_notifications",
  "/notify_disconnect",
  "/orca_presence",
  "/inbox",
  "/mercury",
  "/messaging_events",
  "/orca_message_notifications",
  "/pp",
  "/webrtc_response"
];

function listenMqtt(defaultFuncs, api, ctx, globalCallback) {
  if (ctx.isConnecting) {
    log.warn("listenMqtt", "Connection attempt already in progress, skipping...");
    return;
  }
  ctx.isConnecting = true;

  const sessionID = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + 1;
  const GUID = utils.getGUID();
  const username = {
    u: ctx.userID,
    s: sessionID,
    chat_on: ctx.globalOptions.online,
    fg: false,
    d: GUID,
    ct: 'websocket',
    aid: '219994525426954',
    mqtt_sid: '',
    cp: 3,
    ecp: 10,
    st: [],
    pm: [],
    dc: '',
    no_auto_fg: true,
    gas: null,
    pack: [],
    a: ctx.globalOptions.userAgent,
    p: null,
    php_override: ""
  };

  const cookies = ctx.jar.getCookies('https://www.facebook.com').join('; ');

  let host;
  if (ctx.mqttEndpoint) {
    host = `${ctx.mqttEndpoint}&sid=${sessionID}`;
  } else if (ctx.region) {
    host = `wss://edge-chat.facebook.com/chat?region=${ctx.region.toLowerCase()}&sid=${sessionID}`;
  } else {
    host = `wss://edge-chat.facebook.com/chat?sid=${sessionID}`;
  }

  const options = {
    clientId: 'mqttwsclient',
    protocolId: 'MQIsdp',
    protocolVersion: 3,
    username: JSON.stringify(username),
    clean: true,
    wsOptions: {
      headers: {
        Cookie: cookies,
        Origin: 'https://www.facebook.com',
        'User-Agent': ctx.globalOptions.userAgent || atob("ZmFjZWJvb2tleHRlcm5hbGhpdC8xLjEgKCtodHRwOi8vd3d3LmZhY2Vib29rLmNvbS9leHRlcm5hbGhpdF91YXRleHQucGhwKQ=="),
        Referer: 'https://www.facebook.com/',
        Host: new URL(host).hostname,
      },
      origin: 'https://www.facebook.com',
      protocolVersion: 13,
      binaryType: 'arraybuffer',
    },
    keepalive: 15,
    reschedulePings: true,
    connectTimeout: 30000,
    reconnectPeriod: 3000,
    maxReconnectDelay: 60000,
    backoffFactor: 2,
    jitter: 0.1
  };

  if (ctx.globalOptions.proxy) {
    options.wsOptions.agent = new HttpsProxyAgent(ctx.globalOptions.proxy);
  }

  ctx.mqttClient = new mqtt.Client(() => websocket(host, options.wsOptions), options);
  const mqttClient = ctx.mqttClient;

  let reconnectDelay = 1000;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 100;

  // Periodic ping to keep connection alive
  const pingInterval = setInterval(() => {
    if (mqttClient.connected) {
      mqttClient.publish('/ping', '{}', { qos: 1 }, (err) => {
        if (err) log.error("listenMqtt", `Ping failed: ${err}`);
      });
    }
  }, 30000);

  // Hourly restart timer
  const hourlyRestart = setTimeout(() => {
    log.info("listenMqtt", "Hourly restart triggered");
    mqttClient.end(true, () => {
      listenMqtt(defaultFuncs, api, ctx, globalCallback);
    });
  }, 60 * 60 * 1000);

  // Clean up timers and listeners
  const cleanup = () => {
    clearInterval(pingInterval);
    clearTimeout(hourlyRestart);
    mqttClient.removeAllListeners();
    ctx.isConnecting = false;
  };

  mqttClient.on('connect', () => {
    log.info("listenMqtt", "Connected to MQTT server");
    reconnectDelay = 1000;
    reconnectAttempts = 0;
    ctx.isConnecting = false;

    topics.forEach(topic => mqttClient.subscribe(topic, { qos: 1 }));

    const queue = {
      sync_api_version: 11,
      max_deltas_able_to_process: 100,
      delta_batch_size: 500,
      encoding: "JSON",
      entity_fbid: ctx.userID,
    };

    let topic;
    if (ctx.syncToken) {
      topic = "/messenger_sync_get_diffs";
      queue.last_seq_id = ctx.lastSeqId;
      queue.sync_token = ctx.syncToken;
    } else {
      topic = "/messenger_sync_create_queue";
      queue.initial_titan_sequence_id = ctx.lastSeqId;
      queue.device_params = null;
    }

    mqttClient.publish(topic, JSON.stringify(queue), { qos: 1, retain: false });
    mqttClient.publish("/foreground_state", JSON.stringify({ foreground: ctx.globalOptions.online }), { qos: 1 });
    mqttClient.publish("/set_client_settings", JSON.stringify({ make_user_available_when_in_foreground: true }), { qos: 1 });

    const rTimeout = setTimeout(() => {
      log.warn("listenMqtt", "No /t_ms received, forcing reconnect");
      mqttClient.end(true, () => listenMqtt(defaultFuncs, api, ctx, globalCallback));
    }, 3000);

    ctx.tmsWait = () => {
      clearTimeout(rTimeout);
      ctx.globalOptions.emitReady ? globalCallback({ type: "ready", error: null }) : "";
      delete ctx.tmsWait;
    };
  });

  mqttClient.on('message', (topic, message) => {
    let jsonMessage = Buffer.isBuffer(message) ? Buffer.from(message).toString() : message;
    try {
      jsonMessage = JSON.parse(jsonMessage);
    } catch (e) {
      log.warn("listenMqtt", `Failed to parse message: ${e}`);
      jsonMessage = {};
    }

    if (topic === "/t_ms") {
      if (ctx.tmsWait && typeof ctx.tmsWait === "function") ctx.tmsWait();

      if (jsonMessage.firstDeltaSeqId && jsonMessage.syncToken) {
        ctx.lastSeqId = jsonMessage.firstDeltaSeqId;
        ctx.syncToken = jsonMessage.syncToken;
      }

      if (jsonMessage.lastIssuedSeqId) ctx.lastSeqId = parseInt(jsonMessage.lastIssuedSeqId);

      for (const delta of jsonMessage.deltas || []) {
        parseDelta(defaultFuncs, api, ctx, globalCallback, { delta });
      }
    } else if (topic === "/thread_typing" || topic === "/orca_typing_notifications") {
      const typ = {
        type: "typ",
        isTyping: !!jsonMessage.state,
        from: jsonMessage.sender_fbid.toString(),
        threadID: utils.formatID((jsonMessage.thread || jsonMessage.sender_fbid).toString())
      };
      globalCallback(null, typ);
    } else if (topic === "/orca_presence" && ctx.globalOptions.updatePresence) {
      for (const data of jsonMessage.list || []) {
        const presence = {
          type: "presence",
          userID: data.u.toString(),
          timestamp: data.l * 1000,
          statuses: data.p
        };
        globalCallback(null, presence);
      }
    }
  });

  mqttClient.on('error', (err) => {
    log.error("listenMqtt", `MQTT error: ${err}`);
    cleanup();
    mqttClient.end(true);
    if (ctx.globalOptions.autoReconnect && reconnectAttempts < maxReconnectAttempts) {
      const delay = Math.min(reconnectDelay * options.backoffFactor, options.maxReconnectDelay) * (1 + options.jitter * Math.random());
      log.info("listenMqtt", `Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempts + 1})`);
      setTimeout(() => {
        reconnectAttempts++;
        listenMqtt(defaultFuncs, api, ctx, globalCallback);
      }, delay);
      reconnectDelay *= options.backoffFactor;
    } else {
      globalCallback({ type: "stop_listen", error: `Connection refused after ${reconnectAttempts} attempts: ${err}` }, null);
    }
  });

  mqttClient.on('close', () => {
    log.info("listenMqtt", "Connection closed");
    cleanup();
    if (ctx.globalOptions.autoReconnect && reconnectAttempts < maxReconnectAttempts) {
      const delay = Math.min(reconnectDelay * options.backoffFactor, options.maxReconnectDelay) * (1 + options.jitter * Math.random());
      log.info("listenMqtt", `Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempts + 1})`);
      setTimeout(() => {
        reconnectAttempts++;
        listenMqtt(defaultFuncs, api, ctx, globalCallback);
      }, delay);
      reconnectDelay *= options.backoffFactor;
    }
  });

  mqttClient.on('disconnect', () => {
    log.warn("listenMqtt", "Disconnected from MQTT server");
    cleanup();
    if (ctx.globalOptions.autoReconnect && reconnectAttempts < maxReconnectAttempts) {
      const delay = Math.min(reconnectDelay * options.backoffFactor, options.maxReconnectDelay) * (1 + options.jitter * Math.random());
      log.info("listenMqtt", `Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempts + 1})`);
      setTimeout(() => {
        reconnectAttempts++;
        listenMqtt(defaultFuncs, api, ctx, globalCallback);
      }, delay);
      reconnectDelay *= options.backoffFactor;
    } else {
      process.exit(7378278);
    }
  });

  process.on('SIGINT', () => {
    log.info("listenMqtt", "Received SIGINT, closing MQTT connection");
    cleanup();
    mqttClient.end(true, () => process.exit(0));
  });

  process.on('exit', (code) => {
    log.info("listenMqtt", `Exiting with code ${code}`);
    cleanup();
  });
}

function parseDelta(defaultFuncs, api, ctx, globalCallback, v) {
  if (v.delta.class === "NewMessage") {
    if (ctx.globalOptions.pageID && ctx.globalOptions.pageID !== v.queue) return;

    const resolveAttachmentUrl = (i) => {
      if (!v.delta.attachments || i === v.delta.attachments.length) {
        let fmtMsg;
        try {
          fmtMsg = utils.formatDeltaMessage(v);
        } catch (err) {
          return globalCallback({
            error: "Problem parsing message object. Please open an issue at https://github.com/Schmavery/facebook-chat-api/issues.",
            detail: err,
            res: v,
            type: "parse_error"
          });
        }
        if (fmtMsg && ctx.globalOptions.autoMarkDelivery) {
          markDelivery(ctx, api, fmtMsg.threadID, fmtMsg.messageID);
        }
        return !ctx.globalOptions.selfListen && fmtMsg.senderID === ctx.userID ? undefined : globalCallback(null, fmtMsg);
      }
      if (v.delta.attachments[i].mercury.attach_type === "photo") {
        api.resolvePhotoUrl(v.delta.attachments[i].fbid, (err, url) => {
          if (!err) v.delta.attachments[i].mercury.metadata.url = url;
          resolveAttachmentUrl(i + 1);
        });
      } else {
        resolveAttachmentUrl(i + 1);
      }
    };
    resolveAttachmentUrl(0);
  }

  if (v.delta.class === "ClientPayload") {
    const clientPayload = utils.decodeClientPayload(v.delta.payload);
    if (clientPayload && clientPayload.deltas) {
      for (const delta of clientPayload.deltas) {
        if (delta.deltaMessageReaction && ctx.globalOptions.listenEvents) {
          globalCallback(null, {
            type: "message_reaction",
            threadID: (delta.deltaMessageReaction.threadKey.threadFbId || delta.deltaMessageReaction.threadKey.otherUserFbId).toString(),
            messageID: delta.deltaMessageReaction.messageId,
            reaction: delta.deltaMessageReaction.reaction,
            senderID: delta.deltaMessageReaction.senderId.toString(),
            userID: delta.deltaMessageReaction.userId.toString()
          });
        } else if (delta.deltaRecallMessageData && ctx.globalOptions.listenEvents) {
          globalCallback(null, {
            type: "message_unsend",
            threadID: (delta.deltaRecallMessageData.threadKey.threadFbId || delta.deltaRecallMessageData.threadKey.otherUserFbId).toString(),
            messageID: delta.deltaRecallMessageData.messageID,
            senderID: delta.deltaRecallMessageData.senderID.toString(),
            deletionTimestamp: delta.deltaRecallMessageData.deletionTimestamp,
            timestamp: delta.deltaRecallMessageData.timestamp
          });
        } else if (delta.deltaMessageReply) {
          const mdata = delta.deltaMessageReply.message?.data?.prng ? JSON.parse(delta.deltaMessageReply.message.data.prng) : [];
          const mentions = {};
          for (const { i, o, l } of mdata) {
            mentions[i] = (delta.deltaMessageReply.message.body || "").substring(o, o + l);
          }

          const callbackToReturn = {
            type: "message_reply",
            threadID: (delta.deltaMessageReply.message.messageMetadata.threadKey.threadFbId || delta.deltaMessageReply.message.messageMetadata.threadKey.otherUserFbId).toString(),
            messageID: delta.deltaMessageReply.message.messageMetadata.messageId,
            senderID: delta.deltaMessageReply.message.messageMetadata.actorFbId.toString(),
            attachments: delta.deltaMessageReply.message.attachments.map(att => {
              const mercury = JSON.parse(att.mercuryJSON);
              Object.assign(att, mercury);
              try {
                return utils._formatAttachment(att);
              } catch (ex) {
                return { ...att, error: ex, type: "unknown" };
              }
            }),
            args: (delta.deltaMessageReply.message.body || "").trim().split(/\s+/),
            body: delta.deltaMessageReply.message.body || "",
            isGroup: !!delta.deltaMessageReply.message.messageMetadata.threadKey.threadFbId,
            mentions,
            timestamp: delta.deltaMessageReply.message.messageMetadata.timestamp,
            participantIDs: (delta.deltaMessageReply.message.participants || []).map(e => e.toString())
          };

          if (delta.deltaMessageReply.repliedToMessage) {
            const rmdata = delta.deltaMessageReply.repliedToMessage?.data?.prng ? JSON.parse(delta.deltaMessageReply.repliedToMessage.data.prng) : [];
            const rmentions = {};
            for (const { i, o, l } of rmdata) {
              rmentions[i] = (delta.deltaMessageReply.repliedToMessage.body || "").substring(o, o + l);
            }

            callbackToReturn.messageReply = {
              threadID: (delta.deltaMessageReply.repliedToMessage.messageMetadata.threadKey.threadFbId || delta.deltaMessageReply.repliedToMessage.messageMetadata.threadKey.otherUserFbId).toString(),
              messageID: delta.deltaMessageReply.repliedToMessage.messageMetadata.messageId,
              senderID: delta.deltaMessageReply.repliedToMessage.messageMetadata.actorFbId.toString(),
              attachments: delta.deltaMessageReply.repliedToMessage.attachments.map(att => {
                const mercury = JSON.parse(att.mercuryJSON);
                Object.assign(att, mercury);
                try {
                  return utils._formatAttachment(att);
                } catch (ex) {
                  return { ...att, error: ex, type: "unknown" };
                }
              }),
              args: (delta.deltaMessageReply.repliedToMessage.body || "").trim().split(/\s+/),
              body: delta.deltaMessageReply.repliedToMessage.body || "",
              isGroup: !!delta.deltaMessageReply.repliedToMessage.messageMetadata.threadKey.threadFbId,
              mentions: rmentions,
              timestamp: delta.deltaMessageReply.repliedToMessage.messageMetadata.timestamp,
              participantIDs: (delta.deltaMessageReply.repliedToMessage.participants || []).map(e => e.toString())
            };
            if (ctx.globalOptions.autoMarkDelivery) markDelivery(ctx, api, callbackToReturn.threadID, callbackToReturn.messageID);
            return !ctx.globalOptions.selfListen && callbackToReturn.senderID === ctx.userID ? undefined : globalCallback(null, callbackToReturn);
          } else if (delta.deltaMessageReply.replyToMessageId) {
            const form = {
              av: ctx.globalOptions.pageID,
              queries: JSON.stringify({
                o0: {
                  doc_id: "2848441488556444",
                  query_params: {
                    thread_and_message_id: {
                      thread_id: callbackToReturn.threadID,
                      message_id: delta.deltaMessageReply.replyToMessageId.id
                    }
                  }
                }
              })
            };

            defaultFuncs
              .post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form)
              .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
              .then((resData) => {
                if (resData[resData.length - 1].error_results > 0) throw resData[0].o0.errors;
                if (resData[resData.length - 1].successful_results === 0) throw { error: "forcedFetch: no successful_results", res: resData };

                const fetchData = resData[0].o0.data.message;
                const mobj = {};
                for (const range of fetchData.message.ranges || []) {
                  mobj[range.entity.id] = (fetchData.message.text || "").substr(range.offset, range.length);
                }

                callbackToReturn.messageReply = {
                  threadID: callbackToReturn.threadID,
                  messageID: fetchData.message_id,
                  senderID: fetchData.message_sender.id.toString(),
                  attachments: fetchData.message.blob_attachment.map(att => {
                    try {
                      return utils._formatAttachment({ blob_attachment: att });
                    } catch (ex) {
                      return { ...att, error: ex, type: "unknown" };
                    }
                  }),
                  args: (fetchData.message.text || "").trim().split(/\s+/) || [],
                  body: fetchData.message.text || "",
                  isGroup: callbackToReturn.isGroup,
                  mentions: mobj,
                  timestamp: parseInt(fetchData.timestamp_precise)
                };

                if (ctx.globalOptions.autoMarkDelivery) markDelivery(ctx, api, callbackToReturn.threadID, callbackToReturn.messageID);
                return !ctx.globalOptions.selfListen && callbackToReturn.senderID === ctx.userID ? undefined : globalCallback(null, callbackToReturn);
              })
              .catch(err => log.error("forcedFetch", err));
          } else {
            callbackToReturn.delta = delta;
            if (ctx.globalOptions.autoMarkDelivery) markDelivery(ctx, api, callbackToReturn.threadID, callbackToReturn.messageID);
            return !ctx.globalOptions.selfListen && callbackToReturn.senderID === ctx.userID ? undefined : globalCallback(null, callbackToReturn);
          }
        }
      }
    }
  }

  if (v.delta.class !== "NewMessage" && !ctx.globalOptions.listenEvents) return;

  switch (v.delta.class) {
    case "ReadReceipt":
      let fmtMsg;
      try {
        fmtMsg = utils.formatDeltaReadReceipt(v.delta);
      } catch (err) {
        return globalCallback({
          error: "Problem parsing message object. Please open an issue at https://github.com/Schmavery/facebook-chat-api/issues.",
          detail: err,
          res: v.delta,
          type: "parse_error"
        });
      }
      return globalCallback(null, fmtMsg);
    case "AdminTextMessage":
      switch (v.delta.type) {
        case "change_thread_theme":
        case "change_thread_nickname":
        case "change_thread_admins":
        case "change_thread_approval_mode":
        case "joinable_group_link_mode_change":
        case "rtc_call_log":
        case "group_poll":
        case "update_vote":
        case "magic_words":
        case "messenger_call_log":
        case "participant_joined_group_call":
          let fmtMsg;
          try {
            fmtMsg = utils.formatDeltaEvent(v.delta);
          } catch (err) {
            return globalCallback({
              error: "Problem parsing message object. Please open an issue at https://github.com/Schmavery/facebook-chat-api/issues.",
              detail: err,
              res: v.delta,
              type: "parse_error"
            });
          }
          return globalCallback(null, fmtMsg);
        default:
          return;
      }
    case "ForcedFetch":
      if (!v.delta.threadKey) return;
      const { messageId: mid, threadKey: { threadFbId: tid } } = v.delta;
      if (mid && tid) {
        const form = {
          av: ctx.globalOptions.pageID,
          queries: JSON.stringify({
            o0: {
              doc_id: "2848441488556444",
              query_params: {
                thread_and_message_id: {
                  thread_id: tid.toString(),
                  message_id: mid
                }
              }
            }
          })
        };

        defaultFuncs
          .post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form)
          .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
          .then((resData) => {
            if (resData[resData.length - 1].error_results > 0) throw resData[0].o0.errors;
            if (resData[resData.length - 1].successful_results === 0) throw { error: "forcedFetch: no successful_results", res: resData };

            const fetchData = resData[0].o0.data.message;
            if (utils.getType(fetchData) === "Object") {
              switch (fetchData.__typename) {
                case "ThreadImageMessage":
                  if (!ctx.globalOptions.selfListen && fetchData.message_sender.id.toString() === ctx.userID || !ctx.loggedIn) return;
                  globalCallback(null, {
                    type: "change_thread_image",
                    threadID: utils.formatID(tid.toString()),
                    snippet: fetchData.snippet,
                    timestamp: fetchData.timestamp_precise,
                    author: fetchData.message_sender.id,
                    image: {
                      attachmentID: fetchData.image_with_metadata?.legacy_attachment_id,
                      width: fetchData.image_with_metadata?.original_dimensions.x,
                      height: fetchData.image_with_metadata?.original_dimensions.y,
                      url: fetchData.image_with_metadata?.preview.uri
                    }
                  });
                  break;
                case "UserMessage":
                  globalCallback(null, {
                    type: "message",
                    senderID: utils.formatID(fetchData.message_sender.id),
                    body: fetchData.message.text || "",
                    threadID: utils.formatID(tid.toString()),
                    messageID: fetchData.message_id,
                    attachments: [{
                      type: "share",
                      ID: fetchData.extensible_attachment.legacy_attachment_id,
                      url: fetchData.extensible_attachment.story_attachment.url,
                      title: fetchData.extensible_attachment.story_attachment.title_with_entities.text,
                      description: fetchData.extensible_attachment.story_attachment.description.text,
                      source: fetchData.extensible_attachment.story_attachment.source,
                      image: ((fetchData.extensible_attachment.story_attachment.media || {}).image || {}).uri,
                      width: ((fetchData.extensible_attachment.story_attachment.media || {}).image || {}).width,
                      height: ((fetchData.extensible_attachment.story_attachment.media || {}).image || {}).height,
                      playable: (fetchData.extensible_attachment.story_attachment.media || {}).is_playable || false,
                      duration: (fetchData.extensible_attachment.story_attachment.media || {}).playable_duration_in_ms || 0,
                      subattachments: fetchData.extensible_attachment.subattachments,
                      properties: fetchData.extensible_attachment.story_attachment.properties
                    }],
                    mentions: {},
                    timestamp: parseInt(fetchData.timestamp_precise),
                    isGroup: fetchData.message_sender.id !== tid.toString()
                  });
                  break;
              }
            } else {
              log.error("forcedFetch", `Unexpected fetchData type: ${utils.getType(fetchData)}`);
            }
          })
          .catch(err => log.error("forcedFetch", err));
      }
      break;
    case "ThreadName":
    case "ParticipantsAddedToGroupThread":
    case "ParticipantLeftGroupThread":
      let formattedEvent;
      try {
        formattedEvent = utils.formatDeltaEvent(v.delta);
      } catch (err) {
        return globalCallback({
          error: "Problem parsing message object. Please open an issue at https://github.com/Schmavery/facebook-chat-api/issues.",
          detail: err,
          res: v.delta,
          type: "parse_error"
        });
      }
      return (!ctx.globalOptions.selfListen && formattedEvent.author.toString() === ctx.userID) || !ctx.loggedIn ? undefined : globalCallback(null, formattedEvent);
  }
}

function markDelivery(ctx, api, threadID, messageID) {
  if (threadID && messageID) {
    api.markAsDelivered(threadID, messageID, (err) => {
      if (err) {
        log.error("markAsDelivered", err);
      } else if (ctx.globalOptions.autoMarkRead) {
        api.markAsRead(threadID, err => {
          if (err) log.error("markAsRead", err);
        });
      }
    });
  }
}

module.exports = function (defaultFuncs, api, ctx) {
  let globalCallback = identity;

  getSeqID = function () {
    ctx.t_mqttCalled = false;
    defaultFuncs
      .post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then((resData) => {
        if (utils.getType(resData) !== "Array") throw { error: "Not logged in", res: resData };
        if (resData[resData.length - 1].error_results > 0) throw resData[0].o0.errors;
        if (resData[resData.length - 1].successful_results === 0) throw { error: "getSeqId: no successful_results", res: resData };
        if (resData[0].o0.data.viewer.message_threads.sync_sequence_id) {
          ctx.lastSeqId = resData[0].o0.data.viewer.message_threads.sync_sequence_id;
          listenMqtt(defaultFuncs, api, ctx, globalCallback);
        } else {
          throw { error: "getSeqId: no sync_sequence_id found.", res: resData };
        }
      })
      .catch((err) => {
        log.error("getSeqId", err);
        if (utils.getType(err) === "Object" && err.error === "Not logged in") ctx.loggedIn = false;
        globalCallback(err);
      });
  };

  return async function (callback) {
    class MessageEmitter extends EventEmitter {
      stopListening(callback = () => {}) {
        globalCallback = identity;
        if (ctx.mqttClient) {
          ctx.mqttClient.unsubscribe("/webrtc");
          ctx.mqttClient.unsubscribe("/rtc_multi");
          ctx.mqttClient.unsubscribe("/onevc");
          ctx.mqttClient.publish("/browser_close", "{}");
          ctx.mqttClient.end(true, () => {
            ctx.mqttClient = undefined;
            callback();
          });
        }
      }
    }

    const msgEmitter = new MessageEmitter();
    globalCallback = callback || ((error, message) => {
      if (error) return msgEmitter.emit("error", error);
      msgEmitter.emit("message", message);
    });

    if (!ctx.firstListen) ctx.lastSeqId = null;
    ctx.syncToken = undefined;
    ctx.t_mqttCalled = false;

    form = {
      av: ctx.globalOptions.pageID,
      queries: JSON.stringify({
        o0: {
          doc_id: "3336396659757871",
          query_params: {
            limit: 1,
            before: null,
            tags: ["INBOX"],
            includeDeliveryReceipts: false,
            includeSeqID: true
          }
        }
      })
    };

    if (!ctx.firstListen || !ctx.lastSeqId) {
      getSeqID();
    } else {
      listenMqtt(defaultFuncs, api, ctx, globalCallback);
    }

    api.stopListening = msgEmitter.stopListening.bind(msgEmitter);
    api.stopListeningAsync = util.promisify(msgEmitter.stopListening.bind(msgEmitter));
    return msgEmitter;
  };
};
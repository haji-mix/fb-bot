module.exports["config"] = {
    name: 'pending',
    version: '1.0.0',
    credits: 'Kenneth Panio',
    role: 1,
    info: 'List pending and other threads bot participated',
    type: 'thread',
    cd: 15
};

module.exports["run"] = async ({
    chat, event, args, font, api
}) => {
    try {
        const getUserName = async (uid) => await chat.userName(uid);
        
        const pendingThreads = await api.getThreadList(20, null, ['PENDING']);

        const otherThreads = await api.getThreadList(20, null, ['OTHER']);

        const allThreads = [...(pendingThreads || []), ...(otherThreads || [])];

        if (allThreads.length === 0) {
            return chat.reply(font.monospace("There are no pending or other threads."));
        }

        if (args.length === 0) {
            const threadListPromises = allThreads.map(async (thread, index) => {
                const threadName = thread.name || await getUserName(thread.threadID);
                return `${index + 1}. ${threadName} (${thread.threadID})`;
            });

            const threadList = await Promise.all(threadListPromises);
            return chat.reply(font.monospace(`Pending/Other threads:\n${threadList.join('\n')}\nUse 'approve <number>' or 'reject <number>' to approve or reject specific threads, or "all" for bulk actions.`));
        }

        const action = args[0].toLowerCase();
        if (action === "approve" || action === "reject") {
            if (args[1] && args[1].toLowerCase() === "all") {
                const results = [];

                for (const thread of allThreads) {
                    const threadName = thread.name || await getUserName(thread.threadID);
                    const threadID = thread.threadID;

                    if (action === "approve") {
                        await chat.reply(font.monospace("This Thread has been approved by admin"), threadID);
                        results.push(`Approved thread ${threadName} (${threadID})`);
                    } else if (action === "reject") {
                        if (thread.isGroup && thread.name !== thread.threadID) {
                            await api.removeUserFromGroup(api.getCurrentUserID(), threadID);
                            results.push(`Left group ${threadName} (${threadID})`);
                        } else if (!thread.isGroup && thread.name !== thread.threadID) {
                            const userName = await getUserName(threadID);
                            await chat.block(threadID);
                            await chat.delthread(threadID);
                            results.push(`Rejected User: ${userName} (${threadID})`);
                        } else {
                            results.push(`Invalid thread type for ${threadName} (${threadID}).`);
                        }
                    }
                }

                return chat.reply(font.monospace(results.join('\n')));
            } else {
                const index = parseInt(args[1], 10) - 1;

                if (isNaN(index) || index < 0 || index >= allThreads.length) {
                    return chat.reply(font.monospace(`Invalid thread index.`));
                }

                const thread = allThreads[index];
                const threadName = thread.name || await getUserName(thread.threadID);

                if (action === "approve") {
                    await chat.reply(font.monospace("This Thread has been approved by admin"), thread.threadID);
                    return chat.reply(font.monospace(`Approved thread ${threadName} (${thread.threadID})`));
                }

                if (action === "reject") {
                    if (thread.isGroup && thread.name !== thread.threadID) {
                        await api.removeUserFromGroup(api.getCurrentUserID(), thread.threadID);
                        return chat.reply(font.monospace(`Left group ${threadName} (${thread.threadID})`));
                    }

                    if (!thread.isGroup && thread.name !== thread.threadID) {
                        const userName = await getUserName(thread.threadID);
                        await chat.block(thread.threadID);
                        await chat.delthread(thread.threadID);
                        return chat.reply(font.monospace(`Reject User: ${userName} (${thread.threadID})`));
                    }

                    return chat.reply(font.monospace(`Invalid thread type.`));
                }
            }
        }

        return chat.reply(font.monospace(`Invalid action. Please use 'approve', 'reject', 'approve all', or 'reject all'.`));

    } catch (error) {
        chat.reply(font.monospace("The feature is temporarily unavailable (Blocked By Meta!)."));
    }
};

import { App } from "@slack/bolt";
require("dotenv").config();

// Initializes your app with credentials
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.APP_TOKEN,
});

(async () => {
    const port = 3010
    await app.start(process.env.PORT || port);
    console.log('Bolt app started!!');
})();

app.message("hey", async ({ say }) => {
    try {
        say("Hello Human!");
    } catch (error) {
        console.log("err")
        console.error(error);
    }
});

app.message("hi", async ({ say }) => {
    try {
        say("Hello bro how are you !");
    } catch (error) {
        console.log("err")
        console.error(error);
    }
});
app.command("/approval-test", async ({ command, ack, client }) => {
    await ack();
    const channel_id = command.channel_id;
        
    try{// Open a modal
        await client.views.open({
            trigger_id: command.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'send_request_modal',
                private_metadata: channel_id,
                title: {
                    type: 'plain_text',
                    text: 'Make request'
                },
                blocks: [
                    {
                        type: "section",
                        block_id: "input_send",
                        text: {
                            type: "mrkdwn",
                            text: "Pick users from the list"
                        },
                        accessory: {
                            action_id: "select_user",
                            type: "users_select",
                            placeholder: {
                                type: "plain_text",
                                text: "Select users"
                            }
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'message_send',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'input_action'
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Enter a request'
                        }
                    }
                ],
                submit: {
                    type: 'plain_text',
                    text: 'Submit',
                },
            }
        });
    } catch (error) {
        console.error(error);
    }
});


app.view('send_request_modal', async ({ ack, body, view, client, context }) => {
    await ack();
    const sender_id = body.user.id;
    // console.log(body);
    const sender_name = body.user.name;
    const user_id = view['state']['values']['input_send']['select_user']['selected_user'] ?? "";
    const user = view['state']['values']['input_send']['select_user'];
    const message = view['state']['values']['message_send']['input_action']['value'] ?? "";
    const channelId = view.private_metadata;
    // console.log(user_id);
    const res = await client.users.info({ user: user_id ?? "" });
    console.log(res);
    // console.log(res);
    // console.log(message);
    // console.log(user);

   
    try {
        await client.chat.postMessage({
            channel: user_id,
            text: message,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `You have a new approval request from ${sender_name}:\n\n${message}`
                    }
                },
                {

                    type: 'actions',
                    elements: [
                        {
                            type: 'button',
                            text: {
                                type: 'plain_text',
                                text: 'Approve'
                            },
                            style: 'primary',
                            action_id: 'approve_action',
                            value: JSON.stringify({ action: 'approve', sender_id })
                        },
                        {
                            type: 'button',
                            text: {
                                type: 'plain_text',
                                text: 'Reject'
                            },
                            style: 'danger',
                            action_id: 'reject_action',
                            value: JSON.stringify({ action: 'reject', sender_id })
                        }
                    ]

                }
            ]
        })
    } catch (error) {
        console.log(error);
    }

    try{
        await app.client.chat.postEphemeral({
           
            channel:channelId,
            user: sender_id,
            //@ts-ignore
            text: `Your message has been sent to ${res.user?.real_name}`,
           
        });
    }catch(error){
        console.log("Error: ",error);
    }

});


app.action('approve_action', async ({ ack, body, client, context }) => {
    await ack();
    //@ts-ignore
    const approver_name = body.user.username;
   //console.log("this is body", body.user);
    //@ts-ignore
    const action = body.actions[0];
    const { action: actionValue, sender_id } = JSON.parse(action.value);
    // console.log(sender_id);
    try {
        await client.chat.postMessage({
            channel: sender_id,
            text: `Your message has been approved by ${approver_name}.`
        });
    } catch (error) {
        console.error('Error sending approval message:', error);
    }

    try {
        // Update the message to reflect the action taken
        await app.client.chat.update({
            token: context.botToken,
            channel: body.channel?.id ?? "",
            //@ts-ignore
            ts: body.message.ts,
            text: actionValue,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*${actionValue}*`
                    }
                }
            ]
        });

        console.log(`Message updated to indicate ${actionValue}`);
    } catch (error) {
        console.error('Error updating message:', error);
    }
})

app.action('reject_action', async ({ ack, body, client, context }) => {
    await ack();
    //@ts-ignore
    const approver_name = body.user.username;
   // console.log("this is body", body.user);
    //@ts-ignore
    const action = body.actions[0];
    const { action: actionValue, sender_id } = JSON.parse(action.value);
    console.log(sender_id);
    try {
        await client.chat.postMessage({
            channel: sender_id,
            text: `Your message has been rejected by ${approver_name}.`
        });
    } catch (error) {
        console.error('Error sending rejection  message:', error);
    }

    try {
        // Update the message to reflect the action taken
        await app.client.chat.update({
            token: context.botToken,
            channel: body.channel?.id ?? "",
            //@ts-ignore
            ts: body.message.ts,
            text: actionValue,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*${actionValue}*`
                    }
                }
            ]
        });

        console.log(`Message updated to indicate ${actionValue}`);
    } catch (error) {
        console.error('Error updating message:', error);
    }
})


app.action('button_click', async ({ ack, body, context }) => {
    await ack();
    //@ts-ignore
    const action = body.actions[0];
    const { action: actionValue, sender_id } = JSON.parse(action.value);
    const responseText = actionValue === 'approve' ? 'This request has been approved.' : 'This request has been rejected.';
})

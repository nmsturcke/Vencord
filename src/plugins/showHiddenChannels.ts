import definePlugin from "../utils/types";
import { Channel } from "discord-types/general";
import { findByProps } from "../webpack";

var can = (a, b) => true; // defaults to true while findByProps isn't loaded

const VIEW_CHANNEL = 1024n;

const VOICE_CHANNEL = 2;

// https://github.com/Vendicated/Vencord/pull/101#issuecomment-1279601609
var enabled = false;

export default definePlugin({
    name: "ShowHiddenChannels",
    description: "Shows hidden channels",
    authors: [
        {
            name: "BigDuck",
            id: 1024588272623681609n
        }
    ],
    patches: [
        {
            // RenderLevel defines if a channel is hidden, collapsed in category, visible, etc
            // Here we just show every hidden channels
            find: ".CannotShow",
            replacement: {
                match: /renderLevel:(\w+)\.CannotShow/g,
                replace: "renderLevel:Vencord.Plugins.plugins[\"ShowHiddenChannels\"].isEnabled()?$1.Show:$1.CannotShow"
            }
        },
        {
            // Begining of the function that creates the elements.
            // Changing the name here has a smaller footerprint than changing the permissions and real name
            find: "l=e.hasActiveThreads",
            replacement:
            {
                match: /hasActiveThreads,(.)=function\((\w+),(\w+),(\w+)\){switch\((\w+.type)\)/g,
                replace: "hasActiveThreads,$1=function($2,$3,$4){switch(Vencord.Plugins.plugins[\"ShowHiddenChannels\"].getChannelTypeIcon($2))"
            }

        },
        {
            // This is where the logic that chooses the icon is
            find: ".rulesChannelId))",
            replacement: {
                match: /switch\((\w+)\.type\){case (\w+\.\w+\.GUILD_ANNOUNCEMENT)/g,
                replace: "i=$1._isHiddenChannel?true:i;switch($1._isHiddenChannel?2:$1.type){case $2"
            }
        }
    ],
    getChannelTypeIcon: (channel: Channel) => {
        if (!enabled) {
            (channel as any)._isHiddenChannel = false;
            return channel.type;
        }

        const canView = can(VIEW_CHANNEL, channel);

        // It's a little crude but it doesn't break anything
        (channel as any)._isHiddenChannel = !canView;

        return canView ? channel.type : VOICE_CHANNEL;
    },
    start() {
        ({ can } = findByProps("can", "initialize"));
        enabled = true;
    },
    stop() {
        enabled = false;
    },
    isEnabled() {
        return enabled;
    }
});

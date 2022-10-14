import definePlugin from "../utils/types";
import { Channel } from "discord-types/general";
import { findByProps } from "../webpack";

var can = (a, b) => true;
const VIEW_CHANNEL = 1024n;


export default definePlugin({
    name: "Show Hidden Channels",
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
                replace: "renderLevel:$1.Show"
            }
        },
        {
            // Begining of the function that creates the elements.
            // Changing the name here has a smaller footerprint than changing the permissions and real name
            find: "e.channel,o=e.name,u=e.muted,c=e.selected",
            replacement: {
                match: /(\w+)\.channel,(\w+)=(\w+)\.name,(\w+)=(\w+)\.muted,(\w+)=(\w+)\.selected/g,
                replace: "$1.channel,$2=Vencord.Plugins.plugins[\"Show Hidden Channels\"].getNameForChannel($3.channel),$4=$5.muted,$6=$7.selected"
            }
        }
    ],
    getNameForChannel: (e: Channel) => {
        if (can(VIEW_CHANNEL, e)) {
            return e.name;
        } else {
            // This is a bit hacky, but it works alright
            return "[🔒] " + e.name;
        }
    },
    start() {
        ({ can } = findByProps("can", "initialize"));
    }
});

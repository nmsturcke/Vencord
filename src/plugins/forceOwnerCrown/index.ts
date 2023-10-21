/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, GuildStore } from "@webpack/common";
import { Channel, User } from "discord-types/general";

export default definePlugin({
    name: "ForceOwnerCrown",
    description: "Force the owner crown next to usernames even if the server is large.",
    authors: [Devs.D3SOX, Devs.Nickyux],
    patches: [
        {
            // This is the logic where it decides whether to render the owner crown or not
            find: ".MULTIPLE_AVATAR",
            replacement: {
                match: /(\i)=(\i)\.isOwner,/,
                replace: "$1=$self.isGuildOwner($2),"
            }
        }
    ],
    isGuildOwner(props: { user: User, channel: Channel, guildId?: string; }) {
        if (!props?.user?.id) return false;
        if (props.channel?.type === 3 /* GROUP_DM */) {
            const channel = ChannelStore.getChannel(props.channel.id);
            return channel?.ownerId === props.user.id;
        }

        // guild id is in props twice, fallback if the first is undefined
        const guildId = props.guildId ?? props.channel?.guild_id;
        const userId = props.user.id;

        return GuildStore.getGuild(guildId)?.ownerId === userId;
    },
});

/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { DataStore } from "@api/index.js";
import { definePluginSettings } from "@api/settings.js";
import { OptionType } from "@utils/types.js";
import { NavigationRouter, SelectedChannelStore, Toasts } from "@webpack/common";

import { ChannelTabsPreivew } from "./components.jsx";

export interface ChannelTabsProps { guildId: string, channelId: string; }

export const channelTabsSettings = definePluginSettings({
    onStartup: {
        type: OptionType.SELECT,
        description: "On startup",
        options: [{
            label: "Do nothing (open on the friends tab)",
            value: "nothing",
            default: true
        }, {
            label: "Remember tabs from last session",
            value: "remember"
        }, {
            label: "Open on a specific set of tabs",
            value: "preset"
        }],
    },
    tabSet: {
        component: ChannelTabsPreivew,
        description: "Select which tabs to open at startup",
        type: OptionType.COMPONENT,
    }
});

// TODO: this entire utils section needs a rewrite
let openChannelIndex = 0;
const openChannelHistory = [0];
const maxHistoryLength = 10;

const openChannels: ChannelTabsProps[] = [];

function handleChannelSwitch(ch: ChannelTabsProps) {
    if (openChannels[openChannelIndex].channelId !== ch.channelId) openChannels[openChannelIndex] = ch;
}
function isTabSelected(ch: ChannelTabsProps) {
    return openChannels.indexOf(ch) === openChannelIndex;
}
function setOpenChannel(i: number) {
    openChannelIndex = i;
    openChannelHistory.push(i);
    if (openChannelHistory.length > maxHistoryLength) openChannelHistory.shift();
}
function moveToTab(i: number) {
    if (i < 0 || i >= openChannels.length) return;
    const chnl = openChannels[i];
    setOpenChannel(i);
    if (chnl.channelId !== SelectedChannelStore.getChannelId())
        NavigationRouter.transitionToGuild(chnl.guildId, chnl.channelId);
}
function moveToTabRelative(d: number) {
    const i = d + openChannelIndex;
    moveToTab(i);
}
function createTab(t: ChannelTabsProps, jumpTo?: string | boolean) {
    openChannels.push({ ...t });
    setOpenChannel(openChannels.length - 1);
    if (jumpTo) NavigationRouter.transitionTo(`/channels/${t.guildId}/${t.channelId}${window._.isString(jumpTo) ? `/${jumpTo}` : ""}`);
}
function closeTab(i: number) {
    openChannels.splice(i, 1);
    if (openChannelHistory.length >= 2) {
        openChannelHistory.pop(); // once to remove the entry for the current channel
        const newTab = openChannelHistory.at(-1)!;
        openChannelHistory.pop(); // and once to remove the last item in history
        if (openChannelIndex < newTab) moveToTab(newTab - 1);
        else moveToTab(newTab);
    } else {
        if (openChannelIndex === i) moveToTab(Math.max(i - 1, 0));
        if (openChannelIndex > i) setOpenChannel(openChannelIndex - 1);
    }
}
function closeOtherTabs(i: number) {
    const { length } = openChannels;
    const channel = openChannels[i];
    const lastCurrentChannel = openChannels[openChannelIndex];
    for (let n = 0; n < length; n++) openChannels.pop();
    openChannels.push(channel);
    setOpenChannel(0);
    for (let j = 0; j <= openChannelHistory.length; j++) openChannelHistory.pop();
    if (channel.channelId !== lastCurrentChannel.channelId) moveToTab(openChannelIndex);
}
function closeTabsToTheRight(i: number) {
    const { length } = openChannels;
    for (let n = i; n < length - 1; n++) openChannels.pop();
    if (openChannelIndex > (openChannels.length - 1)) {
        setOpenChannel(openChannels.length - 1);
        moveToTab(openChannelIndex);
    }
}
function closeCurrentTab() {
    openChannels.splice(openChannelIndex, 1);
    moveToTab(Math.max(openChannelIndex - 1, 0));
}
function shiftCurrentTab(direction: 1 /* right */ | -1 /* left */) {
    const prev = openChannels[openChannelIndex + direction];
    if (!prev || !("channelId" in prev)) return;
    openChannels[openChannelIndex + direction] = openChannels[openChannelIndex];
    openChannels[openChannelIndex] = prev;
    setOpenChannel(openChannelIndex + direction);
}
function openStartupTabs(firstTab: ChannelTabsProps, update: () => void) {
    if (openChannels.length) return;
    let tabsToOpen: { openChannels: ChannelTabsProps[], openChannelIndex: number; } = { openChannels: [firstTab], openChannelIndex: 0 };
    if (["remember", "preset"].includes(channelTabsSettings.store.onStartup)) {
        if (Vencord.Plugins.isPluginEnabled("KeepCurrentChannel")) Toasts.show({
            id: Toasts.genId(),
            message: "ChannelTabs - Not restoring tabs as KeepCurrentChannel is enabled",
            type: Toasts.Type.FAILURE,
            options: {
                duration: 3000,
                position: Toasts.Position.BOTTOM
            }
        });
        else {
            if (channelTabsSettings.store.onStartup === "remember") {
                DataStore.get("ChannelTabs_openChannels").then((t: typeof tabsToOpen) => {
                    if (openChannels.length !== 1) return Toasts.show({
                        id: Toasts.genId(),
                        message: "ChannelTabs - Failed to restore tabs",
                        type: Toasts.Type.FAILURE,
                        options: {
                            duration: 3000,
                            position: Toasts.Position.BOTTOM
                        }
                    });
                    openChannels.pop();
                    ({ openChannelIndex } = t);
                    console.log(openChannels, openChannelIndex, t.openChannels[t.openChannelIndex]);
                    NavigationRouter.transitionToGuild(t.openChannels[t.openChannelIndex].guildId, t.openChannels[t.openChannelIndex].channelId);
                });
            } else {
                tabsToOpen = { openChannels: channelTabsSettings.store.tabSet, openChannelIndex: 0 };
            }
        }
    }
    ({ openChannelIndex } = tabsToOpen);
    tabsToOpen.openChannels.forEach(t => openChannels.push(t));
    if (openChannels[openChannelIndex].channelId !== SelectedChannelStore.getChannelId())
        NavigationRouter.transitionToGuild(openChannels[openChannelIndex].guildId, openChannels[openChannelIndex].channelId);
    update();
}
// data argument is only for testing purposes
const saveChannels = (data?: any) => DataStore.set("ChannelTabs_openChannels", data ?? { openChannels, openChannelIndex });

export const ChannelTabsUtils = {
    closeCurrentTab, closeOtherTabs, closeTab, closeTabsToTheRight, createTab, handleChannelSwitch, isTabSelected,
    moveToTab, moveToTabRelative, openChannelHistory, openChannels, saveChannels, shiftCurrentTab, openStartupTabs
};
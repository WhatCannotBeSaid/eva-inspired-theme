/* Private factory input; concatenated by CLIENT_FILES, not a public module. */
    function mountImChannels(ctx) {
        if (typeof document === 'undefined') return undefined

        var BUTTON_ATTR = 'data-eva-im-button'
        var STATE_ATTR = 'data-eva-im-state'
        var ROW_ATTR = 'data-eva-im-row'
        var TREE_ATTR = 'data-eva-im-tree'
        var SESSION_PREFIX = 'session:'
        var WORKSPACE_PREFIX = 'workspace:'
        var OVERFLOW_PREFIX = 'overflow:'
        /* The marker @xmanrui/dsh-im writes on the title span of a Session it opened
           (plugin-src/client/session-channel-logos.js): the value is the channel id, which is
           also the id in the table below, so one attribute answers "which channel is this
           row" without reading its text. */
        var CHANNEL_ATTR = 'data-dsh-im-session-channel'
        /* The host's own names for the 工作区 area and for the empty marker that is a direct
           child of that row -- both are slots, not CSS-Modules classes. */
        var SLOT_SELECTOR = "[data-slot='sidebar.workspaces']"
        var MARK_SELECTOR = "[data-slot='sidebar.workspaces.directoryFlow']"
        /* 46 official clicks take a group of 231 rows to fully expanded. The limit stops a
           control that stops answering; it is not a budget. */
        var CLICK_LIMIT = 200

        /* Round 64 (2026-10-24). The user's words: 「我已切回 dsh-im，恢复工作区侧边栏中与之
           对应的按钮。再按同一实现方式，为其他平台补充对应按钮。最后统一实现显示逻辑：平台已接入
           时显示该按钮，未接入时隐藏该按钮。」 So this effect is round 49's channel filter,
           widened from the two channels the user then had to every channel the plugin ships, and
           with ONE visibility rule for all of them (rounds 50/57 used to split channels into
           "keep the entry while silent" and "hide while silent"). The entries are named
           channels, not platforms in the marketing sense: each one is a session channel
           @xmanrui/dsh-im can open conversations on.

           The table is the plugin's own, in the plugin's own order, read from its source rather
           than guessed: src/channels/shared/session-channel-labels.mjs is
           SESSION_CHANNEL_LABELS = { weixin: ['微信','WeChat'], feishu: ['飞书','Feishu'],
           dingtalk: ['钉钉','DingTalk'], wecom: ['企业微信','WeCom'], qq: ['QQ','QQ'],
           slack: ['Slack','Slack'], telegram: ['Telegram','Telegram'], discord: ['Discord',
           'Discord'], whatsapp: ['WhatsApp','WhatsApp'], imessage: ['iMessage','iMessage'],
           matrix: ['Matrix','Matrix'], office: ['AI Office','AI Office'] }, and
           parseSessionChannelTitle (:17-27) accepts BOTH labels of a pair, each followed by the
           space-middot-space lead and a non-empty rest. Both leads are therefore kept per
           channel: a profile running the plugin in English titles its Sessions 'WeChat · ...'
           and would otherwise fall out of the 微信 view.

           The dot is part of the test on purpose: '微信' alone is a prefix of any session whose
           title merely starts with those two characters (one such row was live once: 微信会话
           移入工作区行Telegram右侧), and the filter showed it in the 微信 view until the lead
           was made exact.

           The rpc is the route that channel's own settings page reads:
           plugin-src/management-rpc.mjs registers one fetch route per channel as 'dsh-im' +
           the channel, so the per-channel part is the route and it lives on the entry. */
        var CHANNELS = [
          { id: 'weixin', leads: ['微信 · ', 'WeChat · '], rpc: 'dsh-im/weixin' },
          { id: 'feishu', leads: ['飞书 · ', 'Feishu · '], rpc: 'dsh-im/feishu' },
          { id: 'dingtalk', leads: ['钉钉 · ', 'DingTalk · '], rpc: 'dsh-im/dingtalk' },
          { id: 'wecom', leads: ['企业微信 · ', 'WeCom · '], rpc: 'dsh-im/wecom' },
          { id: 'qq', leads: ['QQ · '], rpc: 'dsh-im/qq' },
          { id: 'slack', leads: ['Slack · '], rpc: 'dsh-im/slack' },
          { id: 'telegram', leads: ['Telegram · '], rpc: 'dsh-im/telegram' },
          { id: 'discord', leads: ['Discord · '], rpc: 'dsh-im/discord' },
          { id: 'whatsapp', leads: ['WhatsApp · '], rpc: 'dsh-im/whatsapp' },
          { id: 'imessage', leads: ['iMessage · '], rpc: 'dsh-im/imessage' },
          { id: 'matrix', leads: ['Matrix · '], rpc: 'dsh-im/matrix' },
          { id: 'office', leads: ['AI Office · '], rpc: 'dsh-im/office' },
        ]

        /* Round 50, unchanged since: the names below belong to @xmanrui/dsh-im, not to this
           theme. Every channel's host half answers the same status method -- the token-bot
           channels through plugin-src/host/channels/shared/rpc.mjs, office through its own
           controller -- so what stays here is the one method, and the route it is asked on is
           the entry's own. A version of that plugin which renames either costs that entry its
           gate: the probe stops answering, and an entry with no answer is not in the row. */
        var CHANNEL_STATUS = 'connection.status'
        /* One question a minute while the page is on screen, plus one whenever the window
           comes back. The answer changes only when the user binds or unbinds an account in
           the plugin's own settings panel, so a minute of lag on a button is not worth a
           watcher -- and nothing is asked at all while the page is off screen. */
        var STATUS_INTERVAL = 60000

        /* The row's own icons are 16x16 in a 16 viewBox, 1px stroke, currentColor. This set is
           the plugin's own artwork -- plugin-src/client/channel-logos.js, the same glyph it draws
           beside the Session titles it opens -- flattened to currentColor so one family spans
           the row and the hover/lit states apply to all of it. Rounds 41/42 had hand-drawn
           outlines for the two channels that existed then; with twelve of them the row is one
           family instead, and every mark is the one the plugin already uses for that channel.
           Inline SVG, never a bitmap, so a mark keeps its vector edge on a scaled display. */
        var ICONS = {
          weixin: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path fill="currentColor" d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>' +
            '</svg>',
          feishu: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path fill="currentColor" d="M7.2 4.5h7.6c1.2 0 2.1.55 2.7 1.58 1.05 1.8 1.55 3.45 1.58 4.95-2.04-.62-4.2-.15-6.22 1.45C11.3 9.7 9.42 7.04 7.2 4.5Z"/><path fill="currentColor" d="M10.8 13.55c3.3-2.93 5.72-4.24 9.47-2.52-1.2 1.45-2.27 4.18-3.86 5.43-1.67 1.31-3.9.5-5.61-.64v-2.27Z"/><path fill="currentColor" d="M4.4 8.35c3.47 3.61 7.25 6.1 10.33 5.7 1.06-.14 2.2-.72 3.4-1.72-1.04 2.65-2.6 4.8-5.06 6-2.46 1.2-5.56.52-7.42-.72A2.76 2.76 0 0 1 4.4 15.3V8.35Z"/>' +
            '</svg>',
          dingtalk: '<svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">' +
            '<path fill="currentColor" d="M37.05 22.783c-6.758-5.216-14.378-12.128-22.73-19.538-.655-.585-1.242-.354-1.536.42-1.88 4.973-.058 9.386 2.889 11.932s7.368 4.912 10.058 6.155c.105.049.013.203-.093.163-4.953-2.182-8.397-3.765-13.07-7.368-.497-.388-1.01-.242-1.07.521-.384 4.748 2.657 8.483 6.058 9.745 2.1.781 4.398 1.212 6.53 1.474.109.015.084.178-.027.178-2.747.01-6.058-.654-8.935-1.751-.606-.233-.818.25-.722.633.491 2.008 2.974 5.076 6.926 5.73a12 12 0 0 0 2.228.115c.164 0 .208.089.154.217q-2.685 4.6-2.803 4.797c-.091.152-.036.275.156.275h3.543c.164 0 .264.106.18.246l-4.958 8.196c-.191.328.035.565.395.301s15.212-11.133 15.636-11.448c.195-.142.148-.327-.124-.327h-3.18c-.206 0-.252-.14-.111-.28.14-.141 3.602-3.594 4.837-4.888 1.283-1.35 1.938-3.825-.231-5.498"/>' +
            '</svg>',
          qq: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path fill="currentColor" d="M21.395 15.035a40 40 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836l-1.08 2.695a39 39 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673.54.065 2.103-2.472 2.103-2.472 0 1.469.756 3.387 2.394 4.771-.612.188-1.363.479-1.845.835-.434.32-.379.646-.301.778.343.578 5.883.369 7.482.189 1.6.18 7.14.389 7.483-.189.078-.132.132-.458-.301-.778-.483-.356-1.233-.646-1.846-.836 1.637-1.384 2.393-3.302 2.393-4.771 0 0 1.563 2.537 2.103 2.472.251-.03.581-1.39-.438-4.673"/>' +
            '</svg>',
          wecom: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round" d="M17.7 14.5c1.05-1.12 1.65-2.52 1.65-4.03 0-3.82-3.58-6.92-8-6.92s-8 3.1-8 6.92 3.58 6.92 8 6.92c1.17 0 2.28-.22 3.28-.62"/><path fill="currentColor" d="M16.1 15.15c.7-.7 1.83-.7 2.53 0s.7 1.83 0 2.53-1.83.7-2.53 0-.7-1.83 0-2.53Z"/><path fill="currentColor" d="M19.25 13.45a1.36 1.36 0 1 1 1.92 1.92 1.36 1.36 0 0 1-1.92-1.92Z"/><path fill="currentColor" d="M19.55 18.05a1.16 1.16 0 1 1 1.64 1.64 1.16 1.16 0 0 1-1.64-1.64Z"/><path fill="currentColor" d="M15.25 18.75a.92.92 0 1 1 1.3 1.3.92.92 0 0 1-1.3-1.3Z"/>' +
            '</svg>',
          telegram: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path fill="currentColor" d="M23.95 4.57c-.36-1.45-1.43-1.76-2.82-1.24L1.5 10.9c-1.34.52-1.32 1.27-.24 1.6l5.03 1.57 11.66-7.36c.55-.34 1.05-.16.64.21l-9.44 8.52-.37 5.12c.54 0 .78-.24 1.08-.53l2.59-2.51 5.38 3.97c.99.55 1.7.27 1.95-.92L23.95 4.57Z"/>' +
            '</svg>',
          discord: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path fill="currentColor" d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.51c-.21.38-.46.89-.63 1.29a18.4 18.4 0 0 0-5.59 0 13 13 0 0 0-.64-1.29c-1.71.29-3.36.8-4.89 1.52C.59 9.09-.25 13.68.17 18.2a19.9 19.9 0 0 0 6 3.04c.48-.66.91-1.36 1.28-2.1-.7-.26-1.37-.58-2-.96.17-.12.33-.25.49-.38 3.86 1.79 8.04 1.79 11.86 0 .16.13.32.26.49.38-.64.38-1.31.7-2.01.97.37.73.8 1.44 1.28 2.09a19.8 19.8 0 0 0 6-3.04c.49-5.24-.84-9.79-3.24-13.83ZM8.02 15.42c-1.16 0-2.11-1.07-2.11-2.38s.93-2.38 2.11-2.38c1.18 0 2.13 1.08 2.11 2.38 0 1.31-.93 2.38-2.11 2.38Zm7.95 0c-1.16 0-2.11-1.07-2.11-2.38s.93-2.38 2.11-2.38c1.18 0 2.13 1.08 2.11 2.38 0 1.31-.93 2.38-2.11 2.38Z"/>' +
            '</svg>',
          slack: '<svg width="16" height="16" viewBox="0 0 100 100" aria-hidden="true">' +
            '<path fill="currentColor" d="M36.5 0A10.5 10.5 0 0 0 36.5 21H47V10.5A10.5 10.5 0 0 0 36.5 0ZM10.5 26a10.5 10.5 0 0 0 0 21h26a10.5 10.5 0 0 0 0-21Z"/><path fill="currentColor" d="M100 36.5A10.5 10.5 0 0 0 79 36.5V47h10.5A10.5 10.5 0 0 0 100 36.5ZM74 10.5a10.5 10.5 0 0 0-21 0v26a10.5 10.5 0 0 0 21 0Z"/><path fill="currentColor" d="M63.5 100a10.5 10.5 0 0 0 0-21H53v10.5A10.5 10.5 0 0 0 63.5 100ZM89.5 74a10.5 10.5 0 0 0 0-21h-26a10.5 10.5 0 0 0 0 21Z"/><path fill="currentColor" d="M0 63.5a10.5 10.5 0 0 0 21 0V53H10.5A10.5 10.5 0 0 0 0 63.5ZM26 89.5a10.5 10.5 0 0 0 21 0v-26a10.5 10.5 0 0 0-21 0Z"/>' +
            '</svg>',
          whatsapp: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.149-.173.198-.297.298-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479s1.065 2.875 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.981.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.83 9.83 0 0 1 2.893 6.991c-.003 5.45-4.437 9.884-9.886 9.884m8.413-18.297A11.8 11.8 0 0 0 12.055 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.688 1.448h.005c6.557 0 11.892-5.335 11.895-11.893a11.82 11.82 0 0 0-3.486-8.413"/>' +
            '</svg>',
          imessage: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path fill="currentColor" d="M12 2.5C5.65 2.5.5 6.66.5 11.8c0 2.76 1.49 5.24 3.85 6.94.28 1.34-.35 2.76-1.6 4.01 2.1-.2 3.87-.86 5.26-1.85 1.25.4 2.6.62 3.99.62 6.35 0 11.5-4.35 11.5-9.72S18.35 2.5 12 2.5Z"/>' +
            '</svg>',
          matrix: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path fill="currentColor" d="M4 4h16a2.4 2.4 0 0 1 2.4 2.4v8.2A2.4 2.4 0 0 1 20 17h-7.55l-4.2 3.3a.6.6 0 0 1-.98-.47V17H4A2.4 2.4 0 0 1 1.6 14.6V6.4A2.4 2.4 0 0 1 4 4Zm3 4.1a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9Zm5.6 0a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9Zm5.6 0a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9Z"/>' +
            '</svg>',
          office: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path fill="currentColor" d="M4 3.5h10.5a2 2 0 0 1 2 2v13H4v-15Zm2.2 3v1.8h2V6.5h-2Zm4.1 0v1.8h2V6.5h-2Zm-4.1 4v1.8h2v-1.8h-2Zm4.1 0v1.8h2v-1.8h-2ZM8.4 15v3.5h3V15h-3Z"/><path fill="currentColor" d="M18.3 8.2h1.5v3h3v1.5h-3v3h-1.5v-3h-3v-1.5h3v-3Z"/>' +
            '</svg>',
        }

        /* Thirteen labels through the official locale service, the door the pin control and
           the vendored switch already use. A missing or throwing seat costs the wording only.
           The namespace keeps its round-41 name: renaming it would only cost a registered
           dictionary if a second copy of this theme were ever mounted beside this one. */
        var NS = 'eva-im-filter'
        var DICT = {
          zh: {
            weixin: '只看微信会话', feishu: '只看飞书会话', dingtalk: '只看钉钉会话',
            wecom: '只看企业微信会话', qq: '只看 QQ 会话', slack: '只看 Slack 会话',
            telegram: '只看 Telegram 会话', discord: '只看 Discord 会话',
            whatsapp: '只看 WhatsApp 会话', imessage: '只看 iMessage 会话',
            matrix: '只看 Matrix 会话', office: '只看 AI Office 会话', all: '显示全部会话',
          },
          en: {
            weixin: 'Show WeChat conversations', feishu: 'Show Feishu conversations',
            dingtalk: 'Show DingTalk conversations', wecom: 'Show WeCom conversations',
            qq: 'Show QQ conversations', slack: 'Show Slack conversations',
            telegram: 'Show Telegram conversations', discord: 'Show Discord conversations',
            whatsapp: 'Show WhatsApp conversations', imessage: 'Show iMessage conversations',
            matrix: 'Show Matrix conversations', office: 'Show AI Office conversations',
            all: 'Show all conversations',
          },
        }
        var translate = null
        var locale = ctx.get('locale')
        if (locale !== undefined && locale !== null) {
          if (typeof locale.register === 'function') {
            try { locale.register(NS, DICT) } catch (error) { /* an already-registered namespace keeps its first dictionary */ }
          }
          if (typeof locale.bind === 'function') {
            try { translate = locale.bind(NS) } catch (error) { translate = null }
          }
        }

        function label(key) {
          if (translate !== null) {
            try {
              var text = translate(key)
              if (typeof text === 'string' && text !== '') return text
            } catch (error) { /* a translator that throws falls back to the dictionary below */ }
          }
          return DICT.en[key]
        }

        /* 0 = the official list, 1..12 = one channel's conversations only. One number, thirteen
           views: the entries are its positions, so switching from one channel to another is one
           assignment and never a stacked tag. Index+1 rather than an id, because the row's order
           and the table's order are the same thing. */
        var mode = 0
        var action = 0      /* what the pump is driving toward: 1 reveal, 0 restore */
        var opened = {}     /* the groups whose show-more control this effect expanded */
        var unfolded = {}   /* the groups whose folded header this effect unfolded */
        var frame = 0
        var clicks = 0
        var scroll = null
        var scheduled = false
        var disposed = false
        /* Whether any row still carries the tag this effect writes. It goes true on the
           first lit pass and stays true, so a pass with no view lit costs no property reads
           once those writes are gone. */
        var marked = false
        /* Round 50, per channel since round 57: whether a channel holds an account. A key
           that is not there yet means nothing has answered, and round 64 made that ONE answer
           for every channel instead of a per-channel default: no account, no button -- the
           user's words 「平台已接入时显示该按钮，未接入时隐藏该按钮」. statusPending is the
           one-request-at-a-time latch, per channel; statusTimer is the minute the whole thing
           costs. */
        var live = {}
        var statusPending = {}
        var statusTimer = 0

        function schedule() {
          if (scheduled || disposed) return
          scheduled = true
          queueMicrotask(() => {
            scheduled = false
            if (disposed) return
            paint()
          })
        }

        function stop(event) {
          event.stopPropagation()
          event.preventDefault()
        }

        /* The workspaces slot, remembered while it stays attached so a pass does not walk the
           document for it once per batch. The TREE is still looked up fresh below: React
           remounts the tree, and a node remembered from the last pass may already be gone --
           but it remounts into the same slot. */
        var slotHost = null
        function slotNode() {
          if (slotHost !== null && slotHost.isConnected) return slotHost
          slotHost = document.querySelector(SLOT_SELECTOR)
          return slotHost
        }

        /* The session tree. The host renders exactly one role=tree, inside the workspaces
           slot, and every row -- group headers included -- lives in it, so one walk of the
           tree sees both the group a Session sits under and the Session itself. */
        function tree() {
          var slot = slotNode()
          if (slot === null) return null
          var host = slot.querySelector("[role='tree']")
          if (host === null) return null
          if (host.querySelector('[data-row-key]') === null) return null
          return host
        }

        function keyOf(node) {
          var key = node.getAttribute('data-row-key')
          return typeof key === 'string' ? key : null
        }

        /* dsh-im marks its own rows; the title it gives the Session is the marker that
           survives a profile without that plugin. Both live on the row's second child --
           the first is the slot the channel logo sits in -- and the marker is read off
           that cell rather than the row, which is where the live list puts it. The lead
           test keeps the trailing dot, or an ordinary session titled 微信... would join
           the 微信 view; both language labels of a channel are tested, because the plugin
           titles the same Session 'WeChat · ...' in an English profile. */
        function isChannel(row, channel) {
          var cell = row.children.length > 1 ? row.children[1] : null
          if (cell === null) return false
          if (cell.getAttribute(CHANNEL_ATTR) === channel.id) return true
          if (row.getAttribute(CHANNEL_ATTR) === channel.id) return true
          var text = cell.textContent
          var whole = row.textContent
          var lead
          for (var i = 0; i < channel.leads.length; i++) {
            lead = channel.leads[i]
            if (typeof text === 'string' && text.replace(/^[ \t\r\n]+/, '').indexOf(lead) === 0) return true
            if (typeof whole === 'string' && whole.indexOf(lead) === 0) return true
          }
          return false
        }

        /* The channel the selected view is about, or null for the official list. */
        function selected() {
          return mode === 0 ? null : CHANNELS[mode - 1]
        }

        /* Every row of the tree, tagged against what is on screen -- and only while a view is
           lit. The tag names the rows that stay: a Session of the selected channel, which is
           the whole of what the sheet's rule lets through; every other row -- group headers and
           the overflow controls alike -- is untagged and therefore hidden. The Ungrouped header
           goes with them: the user asked for the 未分组 header itself to disappear in filter
           mode, leaving the conversations alone, without touching how its Sessions show or
           switch (m00881). With no view lit no row carries a tag at all, so that pass costs a
           read of one flag and leaves the host's own list attribute for attribute. Only a
           changed value is ever written, which is what lets an observer-driven pass stay silent
           (round 40). */
        function mark(host) {
          var channel = selected()
          var i
          var row
          var key
          var rows
          var seen = false
          if (channel === null) {
            if (!marked) return
            rows = host.querySelectorAll('[' + ROW_ATTR + ']')
            for (i = 0; i < rows.length; i++) rows[i].removeAttribute(ROW_ATTR)
            marked = false
            return
          }
          rows = host.querySelectorAll('[data-row-key]')
          for (i = 0; i < rows.length; i++) {
            row = rows[i]
            key = keyOf(row)
            if (key === null) continue
            if (key.indexOf(SESSION_PREFIX) === 0 && isChannel(row, channel)) {
              seen = true
              if (row.getAttribute(ROW_ATTR) !== 'on') row.setAttribute(ROW_ATTR, 'on')
            } else if (row.getAttribute(ROW_ATTR) !== null) {
              row.removeAttribute(ROW_ATTR)
            }
          }
          if (seen) marked = true
        }

        /* The one attribute the sheet filters on: present while a view is lit, and its value
           is the channel that view is about. Absent means the list is the host's own, which is
           also the whole of the undo. */
        function imView(host) {
          mark(host)
          var channel = selected()
          if (channel !== null) {
            if (host.getAttribute(TREE_ATTR) !== channel.id) host.setAttribute(TREE_ATTR, channel.id)
          } else if (host.getAttribute(TREE_ATTR) !== null) {
            host.removeAttribute(TREE_ATTR)
          }
        }

        /* A button carries the channel it selects in its value, and is on exactly when that
           channel is the selected view. With one view lit at a time, clicking the lit entry
           is also how the user gets back to the official list, which is why the label under
           it reads 显示全部会话 once it is on. */
        function decorate(button, channel) {
          var on = mode !== 0 && CHANNELS[mode - 1].id === channel.id
          var text = label(on ? 'all' : channel.id)
          var state = on ? 'on' : 'off'
          if (button.getAttribute(BUTTON_ATTR) !== channel.id) button.setAttribute(BUTTON_ATTR, channel.id)
          /* The name lives in aria-label only -- which is not drawn -- so hovering an entry
             shows no wording in either state (m00881). A title left by an earlier build is
             taken off the button rather than left to pop up on hover. */
          if (button.getAttribute('aria-label') !== text) button.setAttribute('aria-label', text)
          if (button.getAttribute('title') !== null) button.removeAttribute('title')
          if (button.getAttribute(STATE_ATTR) !== state || button.firstElementChild === null) {
            button.setAttribute(STATE_ATTR, state)
            button.setAttribute('aria-pressed', on ? 'true' : 'false')
            button.innerHTML = ICONS[channel.id]
          }
        }

        function create(channel) {
          var button = document.createElement('button')
          button.type = 'button'
          /* The row's own click opens its group and its mousedown starts a drag; neither
             belongs to this control. React delegates at #root, below document, so a
             bubble-phase stopPropagation keeps the host's onClick out -- the same
             measurement the brand row zones effect relies on. */
          button.addEventListener('mousedown', stop)
          button.addEventListener('pointerdown', stop)
          button.addEventListener('click', onEntryClick)
          decorate(button, channel)
          return button
        }

        /* One stable handler for every entry: which channel was pressed is read back off
           the button, so dispose can unhook it without having kept a closure per button. */
        function onEntryClick(event) {
          var id = this.getAttribute(BUTTON_ATTR)
          for (var i = 0; i < CHANNELS.length; i++) {
            if (CHANNELS[i].id === id) {
              onToggle(event, CHANNELS[i])
              return
            }
          }
        }

        /* The search slot's own row, looked for inside the sidebar first and anywhere
           second: the slot NAME is a stable contract, its nesting is not -- so the scoped
           query is a shortcut and the document query is what still makes it correct. */
        function markerNode() {
          var near = slotNode()
          if (near !== null) {
            var found = near.querySelector(MARK_SELECTOR)
            if (found !== null) return found
          }
          return document.querySelector(MARK_SELECTOR)
        }

        /* The entries, in the row's own document order -- the table's order, which is the
           plugin's -- every one of them before the search slot. Each is created only when
           missing, so a re-render that drops one puts it back in its place. */
        function entry() {
          var marker = markerNode()
          if (marker === null || marker.parentElement === null) return
          var host = marker.parentElement
          var slot = null
          for (var i = 0; i < host.children.length; i++) {
            if (host.children[i].querySelector('input') !== null) { slot = host.children[i]; break }
          }
          var previous = null
          for (var j = 0; j < CHANNELS.length; j++) {
            var channel = CHANNELS[j]
            var button = host.querySelector('[' + BUTTON_ATTR + "='" + channel.id + "']")
            /* Round 64's one rule, for every channel: no account, no entry. The entry an
               earlier pass built comes off if the account was unbound while the page was
               open, and previous still names the last entry that IS in the row, so whatever
               is left keeps its order. */
            if (visible(channel) !== true) {
              if (button !== null && button.parentElement !== null) button.parentElement.removeChild(button)
              continue
            }
            if (button === null) {
              button = create(channel)
              /* The node this entry has to sit before to keep the row's order: the entry
                 to its right if that one is already there, otherwise the search slot --
                 and the slot's own margin-left: auto keeps every official control where it
                 was, right of the 工作区 label. */
              var before = null
              if (previous !== null && previous.parentElement === host) before = previous.nextSibling
              else {
                for (var k = j + 1; k < CHANNELS.length && before === null; k++) {
                  var later = host.querySelector('[' + BUTTON_ATTR + "='" + CHANNELS[k].id + "']")
                  if (later !== null) before = later
                }
                if (before === null) before = slot
              }
              if (before === null) host.appendChild(button)
              else host.insertBefore(button, before)
            }
            decorate(button, channel)
            previous = button
          }
        }

        function paint() {
          if (disposed) return
          entry()
          var host = tree()
          if (host === null) return
          mark(host)
          imView(host)
        }

        /* Round 50, widened in round 64: the answer a channel's own reader accepts, per shape.
           The token-bot channels answer with a snapshot { bots: [...] } and their reader keeps a
           record only when botId is a string (plugin-src/host/channels/shared/rpc.mjs:187 tests
           value?.bots?.find(...)), so the same test is what makes an account count here -- what
           lights this entry is what shows an account in that panel. Office answers its own
           status object (src/channels/office/office-controller.mjs:126-145) whose 'configured'
           is the same fact: a device token is stored for it. true = there is one, false = the
           channel answered and there is none, null = no answer at all. */
        function holdsAccount(result) {
          if (result === null || typeof result !== 'object' || result.ok === false) return null
          var value = result.value
          if (value === null || typeof value !== 'object') return null
          var bots = value.bots
          if (Array.isArray(bots)) {
            for (var i = 0; i < bots.length; i++) {
              var bot = bots[i]
              if (bot !== null && typeof bot === 'object' && typeof bot.botId === 'string' && bot.botId !== '') return true
            }
            return false
          }
          if (typeof value.configured === 'boolean') return value.configured
          return null
        }

        /* Round 64: what the answer means is the same for every channel -- true = the entry is
           in the row. A definite 'no account' takes the entry away; no answer at all (no plugin,
           no connection service, a route that throws or rejects, a shape this build cannot
           read) keeps the last word, so a hiccup cannot take a live entry away. Nothing is
           drawn before the first answer. */
        function visible(channel) {
          return live[channel.id] === true
        }

        /* Only a real answer moves one entry, and only a CHANGED answer costs a pass: a probe
           that fails keeps the last word. If a channel's account goes while its own view is
           lit, the view goes with it -- the tree would otherwise stay filtered with nothing
           lit left to press, so the official list is put back on the same path its own exit
           takes. */
        function acceptStatus(channel, answer) {
          if (disposed || typeof answer !== 'boolean' || answer === live[channel.id]) return
          live[channel.id] = answer
          if (answer === false && selected() === channel) {
            mode = 0
            clicks = 0
            paint()
            action = 0
            pump()
            return
          }
          schedule()
        }

        /* One question per channel, asked through the client service that plugin's own half
           uses -- ctx.get is guarded and its absence is simply no status, so a profile without
           that service keeps this theme alive instead of taking the whole thing down over a
           button. The latch is per channel (statusPending[channel.id]), so one slow route never
           holds the other entries' answers back. */
        function ask(rpc, channel) {
          var pending = null
          try {
            pending = rpc.call('/api', channel.rpc, { method: CHANNEL_STATUS, payload: {} })
          } catch (error) { pending = null }
          if (pending === null || pending === undefined || typeof pending.then !== 'function') {
            statusPending[channel.id] = false
            return
          }
          pending.then(function (result) {
            statusPending[channel.id] = false
            acceptStatus(channel, holdsAccount(result))
          }, function () {
            statusPending[channel.id] = false
          })
        }

        function refreshStatus() {
          if (disposed) return
          if (typeof document !== 'undefined' && document.hidden === true) return
          var connection = null
          try { connection = ctx.get('connection') } catch (error) { connection = null }
          var rpc = connection === null || connection === undefined ? null : connection.rpc
          if (rpc === null || rpc === undefined || typeof rpc.call !== 'function') return
          for (var i = 0; i < CHANNELS.length; i++) {
            var channel = CHANNELS[i]
            if (statusPending[channel.id] === true) continue
            statusPending[channel.id] = true
            ask(rpc, channel)
          }
        }

        function onVisible() {
          if (typeof document !== 'undefined' && document.hidden === true) return
          refreshStatus()
        }

        /* The groups that hold a conversation of the selected channel, read from the two
           snapshots the vendored rail already reads instead of guessed from whatever happens
           to be rendered. The host's own model groups a Session by its cwd -- ui-workspace:
           'summary.cwd === workspace.path', plus a workspaceBySession map built from
           workspace.sessionIds -- and its key for the Ungrouped bucket is the empty
           suffix. This is what makes the entry work cold: a folded group renders no rows
           at all, so nothing on screen says which group the conversations are in. */
        function candidates() {
          var out = []
          var channel = selected()
          if (channel === null) return out
          if (list === null || typeof list.getSnapshot !== 'function') return out
          var snapshot = null
          try { snapshot = list.getSnapshot() } catch (error) { snapshot = null }
          if (snapshot === null || snapshot.byId === undefined || snapshot.byId === null) return out
          var items = []
          var wlist = workspaces === undefined || workspaces === null ? null : workspaces.list
          if (wlist !== null && wlist !== undefined && typeof wlist.getSnapshot === 'function') {
            try {
              var wsnapshot = wlist.getSnapshot()
              if (wsnapshot !== null && wsnapshot.items !== undefined && wsnapshot.items !== null) items = wsnapshot.items
            } catch (error) { items = [] }
          }
          var owner = {}
          var path = {}
          var i
          var j
          for (i = 0; i < items.length; i++) {
            var item = items[i]
            if (item === null || typeof item !== 'object') continue
            var id = item.workspaceId
            if (typeof id !== 'string') continue
            if (typeof item.path === 'string') path[item.path] = id
            var ids = item.sessionIds
            if (ids === undefined || ids === null) continue
            for (j = 0; j < ids.length; j++) owner[ids[j]] = id
          }
          for (var key in snapshot.byId) {
            var session = snapshot.byId[key]
            if (session === null || typeof session !== 'object') continue
            var title = session.title
            if (typeof title !== 'string' || !startsWith(title, channel.leads)) continue
            var group = owner[key]
            if (group === undefined && typeof session.cwd === 'string') group = path[session.cwd]
            if (group === undefined) group = ''
            if (out.indexOf(group) === -1) out.push(group)
          }
          return out
        }

        /* One title, two labels: the plugin parses either of a channel's labels, so the
           model above has to select either as well. */
        function startsWith(text, leads) {
          for (var i = 0; i < leads.length; i++) {
            if (text.indexOf(leads[i]) === 0) return true
          }
          return false
        }

        /* The fallback for a host whose snapshots cannot be read: the groups showing a row
           of the selected channel right now. It cannot see into a folded group, which is
           exactly why it is the fallback and not the rule. */
        function rendered(host) {
          var out = []
          var channel = selected()
          if (host === null || channel === null) return out
          var rows = host.querySelectorAll('[data-row-key]')
          var group = null
          for (var i = 0; i < rows.length; i++) {
            var key = keyOf(rows[i])
            if (key === null) continue
            if (key.indexOf(WORKSPACE_PREFIX) === 0) group = key.slice(WORKSPACE_PREFIX.length)
            else if (key.indexOf(SESSION_PREFIX) === 0 && group !== null && isChannel(rows[i], channel)) {
              if (out.indexOf(group) === -1) out.push(group)
            }
          }
          return out
        }

        /* One official click per frame, in two stages. First the groups themselves: a group
           that holds a conversation of the selected channel can arrive folded, and a folded
           group has no rows and no show-more control, so it is unfolded through its own
           header -- the click a user makes -- and only for the groups the model above names,
           so no other workspace is touched. Then its show-more control, until the control
           reports the group fully expanded: aria-expanded true is the state its own single
           click collapses from, which is what makes the way out one click per group. */
        function openStep(host) {
          var keys = candidates()
          if (keys.length === 0) keys = rendered(host)
          var key
          var i
          for (i = 0; i < keys.length; i++) {
            key = keys[i]
            if (unfolded[key] === true) continue
            var header = document.querySelector('[data-row-key="' + WORKSPACE_PREFIX + key + '"]')
            if (header === null) continue
            if (header.getAttribute('aria-expanded') !== 'false') continue
            unfolded[key] = true
            header.click()
            return true
          }
          for (i = 0; i < keys.length; i++) {
            key = keys[i]
            var control = document.querySelector('[data-row-key="' + OVERFLOW_PREFIX + key + '"]')
            if (control === null) continue
            if (control.getAttribute('aria-expanded') === 'true') continue
            opened[key] = true
            control.click()
            return true
          }
          return false
        }

        /* The way out: collapse what this effect expanded -- only what it recorded, so a
           list the user had already expanded by hand is left exactly as it was -- and then
           fold back the groups it unfolded. Collapsing comes first on purpose: the official
           control resets that group's own limit to five, so folding first would leave the
           group showing every row the next time it is opened. */
        function closeStep() {
          var keys = Object.keys(opened)
          var key
          var i
          for (i = 0; i < keys.length; i++) {
            key = keys[i]
            var control = document.querySelector('[data-row-key="' + OVERFLOW_PREFIX + key + '"]')
            if (control !== null && control.getAttribute('aria-expanded') === 'true') {
              control.click()
              return true
            }
            delete opened[key]
          }
          keys = Object.keys(unfolded)
          for (i = 0; i < keys.length; i++) {
            key = keys[i]
            var header = document.querySelector('[data-row-key="' + WORKSPACE_PREFIX + key + '"]')
            /* Only fold back what is still open: a group the user folded himself while the
               filter was on is already where it started. */
            if (header === null || header.getAttribute('aria-expanded') !== 'true') {
              delete unfolded[key]
              continue
            }
            header.click()
            return true
          }
          return false
        }

        function pump() {
          frame = 0
          if (disposed) return
          if (clicks >= CLICK_LIMIT) return
          var host = tree()
          var more = action === 1 ? openStep(host) : closeStep()
          if (more === false) {
            if (action === 0 && scroll !== null) {
              if (host !== null) host.scrollTop = scroll
              scroll = null
            }
            return
          }
          clicks += 1
          /* React flushes a discrete click before it returns, so the rows the click
             revealed are already here -- tag them now rather than one frame later. */
          if (host !== null) mark(host)
          frame = requestAnimationFrame(pump)
        }

        /* Pressing an entry selects its channel; pressing the lit one puts the official list
           back. The entries are values of one variable, so every other entry goes dim in the
           same pass -- never two lit. */
        function onToggle(event, channel) {
          var was = mode
          var next = 0
          for (var i = 0; i < CHANNELS.length; i++) {
            if (CHANNELS[i].id === channel.id) next = i + 1
          }
          if (next === mode) next = 0
          stop(event)
          mode = next
          clicks = 0
          var host = tree()
          if (mode !== 0) {
            /* From the official list this is a fresh run, with nothing to carry over. From
               another channel -- the move the row adds -- the bookkeeping is kept on purpose:
               the group this effect unfolds for one channel is the same one the next channel's
               conversations sit in, and clearing the record there would leave that group
               expanded after the user has gone back to the official list, which is not the
               list as they found it. */
            if (was === 0) {
              opened = {}
              unfolded = {}
              scroll = host === null ? null : host.scrollTop
            }
            paint()
            action = 1
          } else {
            paint()
            action = 0
          }
          pump()
        }

        function dispose() {
          if (disposed) return
          disposed = true
          if (frame !== 0) cancelAnimationFrame(frame)
          frame = 0
          if (observer !== null && observer !== undefined) observer.disconnect()
          observer = null
          if (offSessions !== null && typeof offSessions === 'function') offSessions()
          offSessions = null
          if (offLocale !== null && typeof offLocale === 'function') offLocale()
          offLocale = null
          /* Round 50: stop asking, and stop listening for the two moments that would have
             asked again. A probe already in flight is left to settle into acceptStatus,
             which returns at once on the disposed flag. */
          if (statusTimer !== 0) clearInterval(statusTimer)
          statusTimer = 0
          if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
            document.removeEventListener('visibilitychange', onVisible)
          }
          if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
            window.removeEventListener('focus', refreshStatus)
          }
          var host = tree()
          if (host !== null) {
            if (host.getAttribute(TREE_ATTR) !== null) host.removeAttribute(TREE_ATTR)
            var tagged = host.querySelectorAll('[' + ROW_ATTR + ']')
            for (var t = 0; t < tagged.length; t++) tagged[t].removeAttribute(ROW_ATTR)
          }
          var buttons = document.querySelectorAll('[' + BUTTON_ATTR + ']')
          for (var k = 0; k < buttons.length; k++) {
            var button = buttons[k]
            button.removeEventListener('mousedown', stop)
            button.removeEventListener('pointerdown', stop)
            button.removeEventListener('click', onEntryClick)
            if (button.parentElement !== null) button.parentElement.removeChild(button)
          }
        }

        /* A new Session, a retitled one, a row React re-rendered: the pass has to run
           again. Only data-row-key is watched, exactly as the pin effect watches it --
           class is rewritten on every render, the key moves only when the row does, and a
           filter on that attribute is also what keeps this effect's own data-eva-im*
           writes from scheduling another pass. */
        /* A batch that provably misses the workspaces slot is not this pass's business: the
           pass reads no row outside it. Three things still schedule, and they are the whole of
           the rule -- a target inside the slot, a node added or removed CONTAINING it, and a
           remembered host that is no longer attached. */
        function touches(records) {
          var host = slotHost
          if (host === null || !host.isConnected) return true
          for (var i = 0; i < records.length; i++) {
            var record = records[i]
            var target = record.target
            if (target !== null && target !== undefined && (target === host || host.contains(target))) return true
            var bags = [record.addedNodes, record.removedNodes]
            for (var b = 0; b < bags.length; b++) {
              var bag = bags[b]
              if (bag === undefined || bag === null) continue
              for (var n = 0; n < bag.length; n++) {
                var node = bag[n]
                if (node === host || (typeof node.contains === 'function' && node.contains(host))) return true
              }
            }
          }
          return false
        }

        var observer = null
        if (document.body !== undefined && document.body !== null) {
          observer = new MutationObserver(function (records) {
            if (!touches(records)) return
            schedule()
          })
          observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-row-key'],
          })
        }
        /* The workspace half of the same pair the vendored rail reads: sessions say which
           conversation belongs to which channel, workspaces say which group its row lives in
           -- which is the only way to reach a conversation inside a group that arrives
           folded, because a folded group renders no rows to look at. */
        var workspaces = ctx.get('workspaces')
        var sessions = ctx.get('sessions')
        var list = sessions === undefined || sessions === null ? null : sessions.list
        var offSessions = null
        if (list !== undefined && list !== null && typeof list.subscribe === 'function') {
          try { offSessions = list.subscribe(schedule) } catch (error) { offSessions = null }
        }
        var offLocale = null
        if (locale !== undefined && locale !== null && typeof locale.subscribe === 'function') {
          try { offLocale = locale.subscribe(schedule) } catch (error) { offLocale = null }
        }
        /* Round 50: the question, asked once now and then on the interval above -- and again
           whenever the page comes back on screen or the window is focused, which is the moment
           the user has most likely just bound or unbound an account. All three are dropped
           again in dispose. */
        if (typeof setInterval === 'function') statusTimer = setInterval(refreshStatus, STATUS_INTERVAL)
        if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
          document.addEventListener('visibilitychange', onVisible)
        }
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
          window.addEventListener('focus', refreshStatus)
        }
        refreshStatus()
        paint()

        return dispose
    }

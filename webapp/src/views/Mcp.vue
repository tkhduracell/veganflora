<template>
  <b-container class="mcp">
    <h1>MCP-server</h1>
    <p class="lead">
      Anslut Claude till receptsamlingen för att söka, läsa och spara recept.
    </p>

    <h4 class="mt-4">Adress</h4>
    <b-input-group>
      <b-form-input :value="endpoint" readonly class="mcp-url" @focus="$event.target.select()" />
      <b-input-group-append>
        <b-button variant="primary" @click="copy(endpoint)">{{ copied === endpoint ? 'Kopierad' : 'Kopiera' }}</b-button>
      </b-input-group-append>
    </b-input-group>

    <h4 class="mt-4">Claude Code</h4>
    <pre class="mcp-cmd">{{ claudeCode }}</pre>
    <b-button size="sm" variant="outline-primary" @click="copy(claudeCode)">{{ copied === claudeCode ? 'Kopierad' : 'Kopiera kommando' }}</b-button>
    <p class="mt-2 text-muted">
      Klistra in OAuth-klienthemligheten när du blir tillfrågad, kör sedan <code>/mcp</code> och välj
      <em>Authenticate</em> för att logga in med Google.
    </p>

    <h4 class="mt-4">claude.ai</h4>
    <ol>
      <li><em>Settings → Connectors → Add custom connector</em></li>
      <li>Klistra in adressen ovan</li>
      <li>Under <em>Advanced settings</em>: OAuth Client ID <code>{{ clientId }}</code> och klienthemligheten</li>
    </ol>

    <p class="text-muted mt-4">
      Inloggning sker med Google. Endast godkända konton släpps in.
    </p>
  </b-container>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue"

const endpoint = "https://veganflora-mcp-520915943790.europe-north1.run.app/mcp"
// Public OAuth client id; the secret is never shipped to the browser.
const clientId = "520915943790-lmrgh4k6vh5ugnsqhc9muhglmhd27i78.apps.googleusercontent.com"

export default defineComponent({
	setup() {
		const copied = ref<string>()
		const claudeCode = `claude mcp add --transport http --client-id ${clientId} --client-secret --callback-port 33418 veganflora-recipes ${endpoint}`

		async function copy(text: string) {
			await navigator.clipboard.writeText(text)
			copied.value = text
			setTimeout(() => {
				if (copied.value === text) copied.value = undefined
			}, 2000)
		}

		return { endpoint, clientId, claudeCode, copied, copy }
	},
})
</script>

<style scoped>
.mcp-url {
  font-family: monospace;
}
.mcp-cmd {
  white-space: pre-wrap;
  word-break: break-all;
  background: #f6f6f6;
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
}
</style>

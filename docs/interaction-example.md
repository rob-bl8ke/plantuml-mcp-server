Here's a realistic interaction flow. The user is talking to an AI assistant (e.g. GitHub Copilot Chat or Claude Desktop) that has the `plantuml-mcp` server registered.

---

**User:**
> I need to document the checkout flow for our e-commerce platform. When a customer clicks "Buy", it calls the Order Service, which validates stock with the Inventory Service, charges via the Payment Gateway, and then sends a confirmation email through the Notification Service. Generate diagrams for this.

**Assistant (internally calls `spec_to_diagrams` tool):**
```json
{
  "spec": "When a customer clicks Buy, it calls the Order Service, which validates stock with the Inventory Service, charges via the Payment Gateway, and then sends a confirmation email through the Notification Service.",
  "diagrams": ["sequence", "component"],
  "title_prefix": "checkout-flow",
  "base_url": "http://localhost:9090/plantuml"
}
```

**Assistant (response to user):**
> Here are the diagrams for your checkout flow:
>
> **Sequence Diagram**
> ![checkout-flow-sequence](http://localhost:9090/plantuml/svg/SoWkIImgAStDuNBAJrBGjLDmpCbCJbMmKiX8pSd9vt98pKi1IW80 "checkout-flow-sequence")
>
> **Component Diagram**
> ![checkout-flow-component](http://localhost:9090/plantuml/svg/LOun3i8m40HxlsAK3Ga17GA4mY4YniJQjXEZcAdIf7RzxfqiHBtt "checkout-flow-component")
>
> Both diagrams are rendered from your spec. Let me know if you'd like to adjust the flow or add an activity diagram showing retry logic.

---

**User (follow-up):**
> Can you also give me just the raw PlantUML for the sequence diagram so I can tweak it?

**Assistant (internally calls `encode_plantuml` tool with `return_source: true`, or simply returns the generated source):**

> Here's the raw PlantUML:
>
> ```
> @startuml
> actor Customer
> participant "Order Service" as OS
> participant "Inventory Service" as IS
> participant "Payment Gateway" as PG
> participant "Notification Service" as NS
>
> Customer -> OS: POST /checkout
> OS -> IS: GET /stock/{itemId}
> IS --> OS: 200 OK { available: true }
> OS -> PG: POST /charge
> PG --> OS: 200 OK { transactionId }
> OS -> NS: POST /notify { email, orderId }
> NS --> OS: 202 Accepted
> OS --> Customer: 201 Created { orderId }
> @enduml
> ```

---

The key insight is that the MCP server acts as a **silent backend tool** — the user never writes PlantUML manually. They describe a system in plain English, and the server handles the LLM prompting, encoding, and URL generation, returning ready-to-embed Markdown image links.> @startuml
> actor Customer
> participant "Order Service" as OS
> participant "Inventory Service" as IS
> participant "Payment Gateway" as PG
> participant "Notification Service" as NS
>
> Customer -> OS: POST /checkout
> OS -> IS: GET /stock/{itemId}
> IS --> OS: 200 OK { available: true }
> OS -> PG: POST /charge
> PG --> OS: 200 OK { transactionId }
> OS -> NS: POST /notify { email, orderId }
> NS --> OS: 202 Accepted
> OS --> Customer: 201 Created { orderId }
> @enduml
> ```

---

The key insight is that the MCP server acts as a **silent backend tool** — the user never writes PlantUML manually. They describe a system in plain English, and the server handles the LLM prompting, encoding, and URL generation, returning ready-to-embed Markdown image links.
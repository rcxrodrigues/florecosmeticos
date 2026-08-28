/*
 * Página de obrigado — dispara o purchase do GA4.
 *
 * O pagou.ai redireciona para cá após o pagamento aprovado, com os dados na URL:
 *   ?tx={transaction_id}&status={status}&amount={amount}&ref={reference}
 *
 * O item (cor/SKU) não vem no redirecionamento; ele foi guardado no
 * localStorage pela landing no momento em que o cliente clicou em finalizar.
 */
(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  var tx = (params.get("tx") || "").trim();
  var status = (params.get("status") || "").trim();
  var ref = (params.get("ref") || "").trim();

  /*
   * O valor pode chegar em centavos (inteiro, como a API do pagou.ai devolve)
   * ou em reais com separador decimal. Sem separador tratamos como centavos.
   */
  function valorEmReais(bruto) {
    if (!bruto) return null;
    var limpo = String(bruto).trim();
    if (/^\d+$/.test(limpo)) return parseInt(limpo, 10) / 100;
    return parseFloat(limpo.replace(/\./g, "").replace(",", "."));
  }

  var valor = valorEmReais(params.get("amount"));

  function itemComprado() {
    var padrao = { item_id: "1313", item_variant: "Preto", price: 29.9, quantity: 1 };
    try {
      var salvo = JSON.parse(window.localStorage.getItem("flore_compra") || "null");
      if (salvo && salvo.item_id) padrao = salvo;
    } catch (e) {}
    return {
      item_id: padrao.item_id,
      item_name: "Carimbo de Delineador Gatinho Perfeito",
      item_brand: "Florè Cosméticos",
      item_category: "Coleção Olhar Marcante",
      item_variant: padrao.item_variant,
      price: padrao.price,
      quantity: padrao.quantity
    };
  }

  /* Impede contar a mesma venda duas vezes se o cliente recarregar a página. */
  function jaContabilizada(id) {
    try {
      var lista = JSON.parse(window.localStorage.getItem("flore_compras_enviadas") || "[]");
      return lista.indexOf(id) !== -1;
    } catch (e) { return false; }
  }

  function marcarComoEnviada(id) {
    try {
      var lista = JSON.parse(window.localStorage.getItem("flore_compras_enviadas") || "[]");
      lista.push(id);
      window.localStorage.setItem("flore_compras_enviadas", JSON.stringify(lista.slice(-50)));
    } catch (e) {}
  }

  function dispararPurchase() {
    if (!tx) return "sem transaction_id na URL";
    if (jaContabilizada(tx)) return "já contabilizada (recarregamento)";

    var item = itemComprado();
    var total = valor !== null && !isNaN(valor) ? valor : item.price * item.quantity;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event: "purchase",
      /*
       * Para o purchase o event_id é o próprio transaction_id: assim o servidor,
       * que recebe a venda pelo webhook do pagou.ai, chega ao mesmo valor sem
       * precisar combinar nada com o navegador.
       */
      event_id: tx,
      ecommerce: {
        transaction_id: tx,
        value: total,
        currency: "BRL",
        items: [item]
      }
    });

    /*
     * Mesmo evento no Pixel, com eventID = transaction_id. O servidor recebe a
     * venda pelo webhook do pagou.ai e chega a esse mesmo id, entao a Meta pareia
     * navegador e CAPI sem contar duas vezes.
     */
    if (typeof window.fbq === "function") {
      window.fbq("track", "Purchase", {
        content_ids: [item.item_id],
        content_type: "product",
        content_name: item.item_name,
        contents: [{ id: item.item_id, quantity: item.quantity }],
        num_items: item.quantity,
        value: total,
        currency: "BRL"
      }, { eventID: tx });
    }

    marcarComoEnviada(tx);
    try { window.localStorage.removeItem("flore_compra"); } catch (e) {}
    return "enviado";
  }

  var resultado = dispararPurchase();

  /* Mostra o número do pedido para o cliente, quando houver. */
  var alvo = document.querySelector("[data-pedido]");
  if (alvo && tx) {
    alvo.textContent = ref || tx;
    alvo.closest("[data-pedido-bloco]").hidden = false;
  }

  /* Diagnóstico visível apenas com ?debug — invisível para o cliente. */
  if (/[?&]debug\b/.test(location.search)) {
    var box = document.createElement("pre");
    box.style.cssText =
      "position:fixed;left:12px;bottom:12px;z-index:9999;max-width:min(92vw,420px);background:#fff;" +
      "color:#7B3532;border:2px solid #C27C65;border-radius:12px;padding:12px;font:12px/1.5 monospace;" +
      "white-space:pre-wrap;box-shadow:0 8px 32px rgba(0,0,0,.18)";
    box.textContent =
      "purchase: " + resultado +
      "\ntransaction_id: " + (tx || "(vazio)") +
      "\nstatus: " + (status || "(vazio)") +
      "\namount bruto: " + (params.get("amount") || "(vazio)") +
      "\nvalor interpretado: " + (valor !== null ? "R$ " + valor.toFixed(2) : "(usou preço padrão)") +
      "\nitem: " + JSON.stringify(itemComprado());
    document.body.appendChild(box);
  }
})();

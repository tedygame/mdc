/* ====================================================
   MDC - Calculadora de Lista de Compras
   Compara preço esperado x preço atual
   ==================================================== */

(function () {
    'use strict';

    const STORAGE_KEY = 'mdc_produtos_v1';
    const CATALOGO_STORAGE_KEY = 'mdc_catalogo_v2';
    const HISTORICO_STORAGE_KEY = 'mdc_historico_v2';

    const listaEl = document.getElementById('produtos-lista');
    const btnAdicionar = document.getElementById('btn-adicionar');
    const btnSomaTotal = document.getElementById('btn-soma-total');
    const btnLimpar = document.getElementById('btn-limpar');
    const btnVerLista = document.getElementById('btn-ver-lista');
    const btnVoltarEdicao = document.getElementById('btn-voltar-edicao');
    const resultadoEl = document.getElementById('resultado-final');
    const resultadoConteudo = document.getElementById('resultado-conteudo');
    const modoEdicao = document.getElementById('modo-edicao');
    const modoLista = document.getElementById('modo-lista');
    const cadernoItens = document.getElementById('caderno-itens');
    const cadernoRodape = document.getElementById('caderno-rodape');
    const listaData = document.getElementById('lista-data');

    /* ----------- Custom Dialogs (Toasts & Modais) ----------- */
    const toastContainer = document.getElementById('toast-container');
    const modalConfirmacao = document.getElementById('modal-confirmacao');
    const btnModalCancelar = document.getElementById('btn-modal-cancelar');
    const btnModalConfirmar = document.getElementById('btn-modal-confirmar');
    const btnModalArquivarLimpar = document.getElementById('btn-modal-arquivar-limpar');
    let modalResolver = null;

    /* ----------- Catálogo & Histórico Elements ----------- */
    const btnCatalogo = document.getElementById('btn-catalogo');
    const modalCatalogo = document.getElementById('modal-catalogo');
    const btnFecharCatalogo = document.getElementById('btn-fechar-catalogo');
    const formCadastroProduto = document.getElementById('form-cadastro-produto');
    const catalogoListaItens = document.getElementById('catalogo-lista-itens');
    const datalistSugestoes = document.getElementById('sugestoes-produtos');
    const btnImportarBackup = document.getElementById('btn-importar-backup');
    const inputImportarBackup = document.getElementById('input-importar-backup');

    const abaBtnCatalogo = document.getElementById('aba-btn-catalogo');
    const abaBtnHistorico = document.getElementById('aba-btn-historico');
    const secaoCatalogo = document.getElementById('modal-secao-catalogo');
    const secaoHistorico = document.getElementById('modal-secao-historico');
    const listItemHistorico = document.getElementById('historico-lista-itens');

    const visualizadorDetalhe = document.getElementById('historico-visualizador-detalhe');
    const detalheTituloData = document.getElementById('detalhe-titulo-data');
    const detalheItensLista = document.getElementById('detalhe-itens-lista');
    const btnFecharDetalhe = document.getElementById('btn-fechar-detalhe');

    function mostrarToast(mensagem, tipo = 'sucesso') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;
        
        let iconeSvg = '';
        if (tipo === 'sucesso') {
            iconeSvg = `<svg class="toast-icone" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`;
        } else if (tipo === 'aviso') {
            iconeSvg = `<svg class="toast-icone" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
        } else {
            iconeSvg = `<svg class="toast-icone" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
        }

        toast.innerHTML = `${iconeSvg}<span>${mensagem}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    function abrirConfirmacaoModal() {
        return new Promise((resolve) => {
            modalResolver = resolve;
            modalConfirmacao.classList.remove('oculto');
        });
    }

    function fecharModal(retorno) {
        modalConfirmacao.classList.add('oculto');
        if (modalResolver) {
            modalResolver(retorno);
            modalResolver = null;
        }
    }

    btnModalArquivarLimpar.addEventListener('click', () => fecharModal('arquivar'));
    btnModalConfirmar.addEventListener('click', () => fecharModal('limpar'));
    btnModalCancelar.addEventListener('click', () => fecharModal(null));
    modalConfirmacao.querySelector('.modal-overlay').addEventListener('click', () => fecharModal(null));

    /* ----------- Lógica do Catálogo ----------- */
    let catalogo = [];
    let itemEmEdicao = null;
    const catalogoPadrao = [
        { nome: 'Arroz', preco1: '28,90', precoCusto: '20,00' },
        { nome: 'Feijão', preco1: '8,50', precoCusto: '6,20' },
        { nome: 'Leite', preco1: '4,60', precoCusto: '3,20' },
        { nome: 'Café', preco1: '16,90', precoCusto: '12,50' },
        { nome: 'Açúcar', preco1: '5,20', precoCusto: '3,80' },
        { nome: 'Óleo', preco1: '6,80', precoCusto: '5,00' },
        { nome: 'Manteiga', preco1: '9,80', precoCusto: '7,00' },
        { nome: 'Pão de Forma', preco1: '7,50', precoCusto: '5,20' },
        { nome: 'Sabão em Pó', preco1: '14,90', precoCusto: '10,50' },
        { nome: 'Detergente', preco1: '2,40', precoCusto: '1,70' }
    ];

    function carregarCatalogo() {
        try {
            const dados = localStorage.getItem(CATALOGO_STORAGE_KEY);
            if (dados) {
                catalogo = JSON.parse(dados);
            } else {
                catalogo = [...catalogoPadrao];
                salvarCatalogo();
            }
        } catch (e) {
            catalogo = [...catalogoPadrao];
        }
        renderizarDatalist();
    }

    function salvarCatalogo() {
        try {
            localStorage.setItem(CATALOGO_STORAGE_KEY, JSON.stringify(catalogo));
        } catch (e) {}
        renderizarDatalist();
    }

    function renderizarDatalist() {
        datalistSugestoes.innerHTML = '';
        catalogo.forEach(item => {
            const option = document.createElement('option');
            option.value = item.nome;
            datalistSugestoes.appendChild(option);
        });
    }

    function renderizarListaCatalogo() {
        catalogoListaItens.innerHTML = '';
        if (catalogo.length === 0) {
            catalogoListaItens.innerHTML = '<div style="text-align: center; color: var(--text-light); padding: 1rem; font-size: 0.875rem;">Nenhum produto cadastrado.</div>';
            return;
        }

        const ordenado = [...catalogo].sort((a, b) => a.nome.localeCompare(b.nome));

        ordenado.forEach(item => {
            const el = document.createElement('div');
            el.className = 'item-catalogo-linha';
            el.innerHTML = `
                <div class="catalogo-item-info">
                    <span class="catalogo-item-nome">${escaparHtml(item.nome)}</span>
                    <span class="catalogo-item-preco" style="font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 0.75rem; font-weight: 600; margin-top: 0.25rem;">
                        <span>Venda: <strong style="color: var(--primary);">${formatarMoeda(paraNumero(item.preco1))}</strong></span>
                        <span>Custo: <strong style="color: var(--success);">${formatarMoeda(paraNumero(item.precoCusto))}</strong></span>
                    </span>
                </div>
                <div class="catalogo-item-acoes">
                    <button type="button" class="btn-catalogo-editar" aria-label="Editar" title="Editar produto">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </button>
                    <button type="button" class="btn-catalogo-remover" aria-label="Remover" title="Excluir produto">&times;</button>
                </div>
            `;

            el.querySelector('.btn-catalogo-editar').addEventListener('click', () => {
                iniciarEdicaoCatalogo(item);
            });

            el.querySelector('.btn-catalogo-remover').addEventListener('click', () => {
                removerItemCatalogo(item.nome);
            });

            catalogoListaItens.appendChild(el);
        });
    }

    function iniciarEdicaoCatalogo(item) {
        itemEmEdicao = item.nome;
        document.getElementById('cad-nome').value = item.nome;
        document.getElementById('cad-preco').value = item.preco1;
        document.getElementById('cad-preco-custo').value = item.precoCusto || '';

        const btnSubmit = formCadastroProduto.querySelector('.btn-cadastrar-submit');
        btnSubmit.textContent = 'Salvar Alterações';
        btnSubmit.classList.add('em-edicao');

        document.getElementById('cad-preco').focus();
    }

    function cancelarEdicaoCatalogo() {
        itemEmEdicao = null;
        formCadastroProduto.reset();

        const btnSubmit = formCadastroProduto.querySelector('.btn-cadastrar-submit');
        btnSubmit.textContent = 'Cadastrar no Catálogo';
        btnSubmit.classList.remove('em-edicao');
    }

    function cadastrarProdutoCatalogo(nome, preco1, precoCusto) {
        const nomeLimpo = nome.trim();
        if (!nomeLimpo) return;

        if (itemEmEdicao) {
            const index = catalogo.findIndex(item => item.nome.toLowerCase() === itemEmEdicao.toLowerCase());
            if (index > -1) {
                const nomeJaExiste = catalogo.some((item, idx) => idx !== index && item.nome.toLowerCase() === nomeLimpo.toLowerCase());
                if (nomeJaExiste) {
                    mostrarToast(`Um produto com o nome "${nomeLimpo}" já existe no catálogo.`, 'aviso');
                    return;
                }
                catalogo[index].nome = nomeLimpo;
                catalogo[index].preco1 = preco1;
                catalogo[index].precoCusto = precoCusto;
                mostrarToast(`Produto "${nomeLimpo}" atualizado com sucesso!`, 'sucesso');
            }
            cancelarEdicaoCatalogo();
        } else {
            const index = catalogo.findIndex(item => item.nome.toLowerCase() === nomeLimpo.toLowerCase());
            if (index > -1) {
                catalogo[index].preco1 = preco1;
                catalogo[index].precoCusto = precoCusto;
                mostrarToast(`Preço de "${nomeLimpo}" atualizado no catálogo.`, 'sucesso');
            } else {
                catalogo.push({ nome: nomeLimpo, preco1, precoCusto });
                mostrarToast(`"${nomeLimpo}" adicionado ao catálogo.`, 'sucesso');
            }
        }

        salvarCatalogo();
        renderizarListaCatalogo();
    }

    function removerItemCatalogo(nome) {
        if (itemEmEdicao && itemEmEdicao.toLowerCase() === nome.toLowerCase()) {
            cancelarEdicaoCatalogo();
        }
        catalogo = catalogo.filter(item => item.nome.toLowerCase() !== nome.toLowerCase());
        salvarCatalogo();
        renderizarListaCatalogo();
        mostrarToast('Produto removido do catálogo.', 'info');
    }

    /* ----------- Lógica de Abas e Histórico ----------- */
    let historico = [];

    function carregarHistorico() {
        try {
            const dados = localStorage.getItem(HISTORICO_STORAGE_KEY);
            if (dados) {
                historico = JSON.parse(dados);
            }
        } catch (e) {}
    }

    function salvarHistorico() {
        try {
            localStorage.setItem(HISTORICO_STORAGE_KEY, JSON.stringify(historico));
        } catch (e) {}
    }

    function arquivarListaAtual() {
        if (produtos.length === 0) return;
        
        let totalEsperado = 0;
        let totalAtual = 0;
        let temPreco2 = false;

        produtos.forEach(p => {
            totalEsperado += calcSubtotal(p.preco1, p.quantidade);
            const sub2 = calcSubtotal(p.preco2, p.quantidade);
            totalAtual += sub2;
            if (p.preco2 && paraNumero(p.preco2) > 0) temPreco2 = true;
        });

        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, '0');
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = hoje.getFullYear();
        const dataString = `${dia}/${mes}/${ano}`;

        const novaEntrada = {
            data: dataString,
            totalEsperado: totalEsperado,
            totalAtual: temPreco2 ? totalAtual : 0,
            produtos: produtos.map(p => ({
                nome: p.nome,
                quantidade: p.quantidade,
                preco1: p.preco1,
                preco2: p.preco2 || ''
            }))
        };

        historico.unshift(novaEntrada);

        // Mantém apenas as duas últimas listas
        if (historico.length > 2) {
            historico = historico.slice(0, 2);
        }

        salvarHistorico();
    }

    function renderizarListaHistorico() {
        listItemHistorico.innerHTML = '';
        visualizadorDetalhe.classList.add('oculto');

        if (historico.length === 0) {
            listItemHistorico.innerHTML = '<div style="text-align: center; color: var(--text-light); padding: 1.5rem; font-size: 0.875rem;">Nenhuma lista arquivada ainda.</div>';
            return;
        }

        historico.forEach((lista, index) => {
            const card = document.createElement('div');
            card.className = 'historico-card';
            
            const totalRealTexto = lista.totalAtual > 0 ? formatarMoeda(lista.totalAtual) : 'Não preenchido';

            card.innerHTML = `
                <div class="historico-cabecalho-linha">
                    <span class="historico-data-span">Lista de ${lista.data}</span>
                    <span style="font-size: 0.75rem; color: var(--text-light); font-weight: 700;">#${index + 1}</span>
                </div>
                <div class="historico-resumo-valores">
                    <span>Planejado: <span class="historico-valor-item val-esp">${formatarMoeda(lista.totalEsperado)}</span></span>
                    <span>Real: <span class="historico-valor-item val-real">${totalRealTexto}</span></span>
                </div>
                <div class="historico-acoes-linha">
                    <button type="button" class="btn-historico-acao btn-historico-ver" data-acao="ver">Visualizar</button>
                    <button type="button" class="btn-historico-acao btn-historico-restaurar" data-acao="restaurar">Restaurar</button>
                </div>
            `;

            card.querySelector('[data-acao="ver"]').addEventListener('click', () => {
                exibirDetalhesLista(lista);
            });

            card.querySelector('[data-acao="restaurar"]').addEventListener('click', () => {
                restaurarListaAntiga(lista);
            });

            listItemHistorico.appendChild(card);
        });
    }

    function exibirDetalhesLista(lista) {
        detalheTituloData.textContent = `Itens da lista de ${lista.data}`;
        detalheItensLista.innerHTML = '';
        
        lista.produtos.forEach(p => {
            const p1 = paraNumero(p.preco1);
            const p2 = paraNumero(p.preco2);
            const subtotalTexto = p2 > 0 ? formatarMoeda(p2 * paraNumero(p.quantidade)) : formatarMoeda(p1 * paraNumero(p.quantidade));
            
            const itemLinha = document.createElement('div');
            itemLinha.className = 'detalhe-item-linha';
            itemLinha.innerHTML = `
                <span style="font-weight: 700; color: var(--text-main);">${escaparHtml(p.nome)} (${p.quantidade} un)</span>
                <span style="color: var(--text-muted); font-size: 0.75rem; font-weight: 600;">
                    ${p2 > 0 ? 'Pago: ' + formatarMoeda(p2) : 'Est: ' + formatarMoeda(p1)} 
                    · ${subtotalTexto}
                </span>
            `;
            detalheItensLista.appendChild(itemLinha);
        });

        visualizadorDetalhe.classList.remove('oculto');
        visualizadorDetalhe.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function restaurarListaAntiga(lista) {
        const confirmou = confirm(`Deseja restaurar a lista de ${lista.data}? Isso substituirá a lista atual na tela principal.`);
        if (!confirmou) return;

        produtos = lista.produtos.map((p, idx) => ({
            id: idx + 1,
            nome: p.nome,
            quantidade: p.quantidade,
            preco1: p.preco1,
            preco2: p.preco2 || '',
            salvo: true
        }));
        
        proximoId = produtos.length + 1;
        salvar();
        renderizarLista();
        
        modalCatalogo.classList.add('oculto');
        cancelarEdicaoCatalogo();
        
        mostrarToast(`Lista de ${lista.data} restaurada!`, 'sucesso');
    }

    abaBtnCatalogo.addEventListener('click', () => {
        abaBtnCatalogo.classList.add('ativa');
        abaBtnHistorico.classList.remove('ativa');
        secaoCatalogo.classList.remove('oculto');
        secaoHistorico.classList.add('oculto');
    });

    abaBtnHistorico.addEventListener('click', () => {
        abaBtnHistorico.classList.add('ativa');
        abaBtnCatalogo.classList.remove('ativa');
        secaoHistorico.classList.remove('oculto');
        secaoCatalogo.classList.add('oculto');
        renderizarListaHistorico();
    });

    btnFecharDetalhe.addEventListener('click', () => {
        visualizadorDetalhe.classList.add('oculto');
    });

    btnCatalogo.addEventListener('click', () => {
        modalCatalogo.classList.remove('oculto');
        abaBtnCatalogo.click(); // Abre na aba de catálogo por padrão
        renderizarListaCatalogo();
    });

    btnFecharCatalogo.addEventListener('click', () => {
        modalCatalogo.classList.add('oculto');
        cancelarEdicaoCatalogo();
    });

    modalCatalogo.querySelector('.modal-overlay').addEventListener('click', () => {
        modalCatalogo.classList.add('oculto');
        cancelarEdicaoCatalogo();
    });

    formCadastroProduto.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = document.getElementById('cad-nome').value;
        const preco = document.getElementById('cad-preco').value;
        const precoCusto = document.getElementById('cad-preco-custo').value;
        cadastrarProdutoCatalogo(nome, preco, precoCusto);
    });

    // Importação de Backup do outro sistema
    btnImportarBackup.addEventListener('click', () => {
        inputImportarBackup.click();
    });

    inputImportarBackup.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const backup = JSON.parse(event.target.result);
                if (backup && Array.isArray(backup.products)) {
                    let importados = 0;
                    let atualizados = 0;

                    backup.products.forEach(p => {
                        if (p.name && p.price !== undefined) {
                            const nomeLimpo = p.name.trim();
                            const precoReal = Number(p.price).toFixed(2).replace('.', ',');
                            const precoCustoReal = p.costPrice !== undefined ? Number(p.costPrice).toFixed(2).replace('.', ',') : '0,00';

                            const idx = catalogo.findIndex(item => item.nome.toLowerCase() === nomeLimpo.toLowerCase());
                            if (idx > -1) {
                                let mudou = false;
                                if (catalogo[idx].preco1 !== precoReal) {
                                    catalogo[idx].preco1 = precoReal;
                                    mudou = true;
                                }
                                if (catalogo[idx].precoCusto !== precoCustoReal) {
                                    catalogo[idx].precoCusto = precoCustoReal;
                                    mudou = true;
                                }
                                if (mudou) {
                                    atualizados++;
                                }
                            } else {
                                catalogo.push({
                                    nome: nomeLimpo,
                                    preco1: precoReal,
                                    precoCusto: precoCustoReal
                                });
                                importados++;
                            }
                        }
                    });

                    if (importados > 0 || atualizados > 0) {
                        salvarCatalogo();
                        renderizarListaCatalogo();
                        mostrarToast(`${importados} importados, ${atualizados} atualizados!`, 'sucesso');
                    } else {
                        mostrarToast('Nenhum produto novo no backup.', 'info');
                    }
                } else {
                    mostrarToast('Formato de backup inválido.', 'aviso');
                }
            } catch (err) {
                mostrarToast('Erro ao ler o arquivo de backup.', 'aviso');
            }
            inputImportarBackup.value = '';
        };
        reader.readAsText(file);
    });

    let produtos = [];
    let proximoId = 1;

    /* ----------- Utilidades ----------- */

    function calcularMargem(custo, venda) {
        const c = paraNumero(custo);
        const v = paraNumero(venda);
        if (c <= 0 || v <= 0) return '';
        const diff = ((v - c) / c) * 100;
        return ` (+${diff.toFixed(1)}% margem)`;
    }

    function atualizarMargemCardRealTime(card, id) {
        const inputP1 = card.querySelector(`#p1-${id}`);
        const inputPv = card.querySelector(`#pv-${id}`);
        const margemEl = card.querySelector(`#margem-tempo-real-${id}`);
        if (!margemEl || !inputP1 || !inputPv) return;

        const c = paraNumero(inputP1.value);
        const v = paraNumero(inputPv.value);
        if (c > 0 && v > 0) {
            const diff = ((v - c) / c) * 100;
            margemEl.querySelector('.txt-margem').textContent = `+${diff.toFixed(1)}%`;
            margemEl.style.display = 'block';
        } else {
            margemEl.style.display = 'none';
        }
    }

    function formatarMoeda(valor) {
        if (isNaN(valor) || valor === null) valor = 0;
        return valor.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function paraNumero(texto) {
        if (typeof texto !== 'string') texto = String(texto || '');
        const limpo = texto.replace(/\./g, '').replace(',', '.').trim();
        const n = parseFloat(limpo);
        return isNaN(n) ? 0 : n;
    }

    function salvar() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(produtos));
        } catch (e) {
            // Sem persistência se o navegador bloquear
        }
    }

    function carregar() {
        try {
            const dados = localStorage.getItem(STORAGE_KEY);
            if (dados) {
                const lista = JSON.parse(dados);
                if (Array.isArray(lista) && lista.length > 0) {
                    produtos = lista;
                    proximoId = Math.max(...produtos.map(p => p.id)) + 1;
                    return true;
                }
            }
        } catch (e) {
            // Ignora erro de leitura
        }
        return false;
    }

    /* ----------- Renderização ----------- */

    function renderizarLista() {
        listaEl.innerHTML = '';

        if (produtos.length === 0) {
            const vazio = document.createElement('div');
            vazio.className = 'vazio-mensagem';
            vazio.textContent = 'Nenhum produto ainda. Toque em "Novo" para começar.';
            listaEl.appendChild(vazio);
            return;
        }

        produtos.forEach((produto, indice) => {
            listaEl.appendChild(criarCardProduto(produto, indice));
        });
    }

    function criarCardProduto(produto, indice) {
        const card = document.createElement('div');
        const isSalvo = !!produto.salvo;
        card.className = `produto-card ${isSalvo ? 'estado-salvo' : ''}`;
        card.dataset.id = produto.id;

        const correspondencia = catalogo.find(item => item.nome.toLowerCase() === (produto.nome || '').trim().toLowerCase());
        const precoVendaRef = correspondencia ? correspondencia.preco1 : null;
        const precoCustoRef = correspondencia ? correspondencia.precoCusto : null;

        let informacaoPrecosHtml = '';
        if (precoVendaRef || precoCustoRef) {
            informacaoPrecosHtml = `
                <div class="referencia-precos-card" style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; margin-top: 0.5rem; margin-bottom: 0.25rem; display: flex; gap: 0.625rem; background: #f8fafc; padding: 0.375rem 0.625rem; border-radius: 8px; border: 1px solid #f1f5f9;">
                    ${precoCustoRef ? `<span>Custo ref: <strong style="color: var(--success);">${formatarMoeda(paraNumero(precoCustoRef))}</strong></span>` : ''}
                    ${precoVendaRef ? `<span>Venda ref: <strong style="color: var(--primary);">${formatarMoeda(paraNumero(precoVendaRef))}</strong></span>` : ''}
                </div>
            `;
        }

        card.innerHTML = `
            <div class="produto-cabecalho">
                <span class="produto-numero">Produto ${indice + 1}</span>
                <button type="button" class="btn-remover" aria-label="Remover produto" data-acao="remover" ${isSalvo ? 'disabled' : ''}>×</button>
            </div>

            <div class="campo">
                <label class="campo-label" for="nome-${produto.id}">Nome do produto</label>
                <div class="campo-input-container com-icone">
                    <svg class="input-icone" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"/></svg>
                    <input
                        type="text"
                        id="nome-${produto.id}"
                        class="campo-input"
                        data-campo="nome"
                        list="sugestoes-produtos"
                        placeholder="Ex: Arroz, Feijão, Leite..."
                        value="${escaparHtml(produto.nome)}"
                        autocomplete="off"
                        ${isSalvo ? 'disabled' : ''}
                    >
                </div>
                <div id="ref-container-${produto.id}">${informacaoPrecosHtml}</div>
            </div>

            <div class="campo">
                <label class="campo-label" for="qtd-${produto.id}">Quantidade</label>
                <div class="campo-input-container com-icone">
                    <svg class="input-icone" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
                    <input
                        type="text"
                        inputmode="decimal"
                        id="qtd-${produto.id}"
                        class="campo-input"
                        data-campo="quantidade"
                        placeholder="Ex: 2"
                        value="${produto.quantidade || ''}"
                        ${isSalvo ? 'disabled' : ''}
                    >
                </div>
            </div>

            <div class="grupo-preco grupo-1">
                <h3>Preços Esperados (Referência)</h3>
                
                <div class="campo">
                    <label class="campo-label" for="p1-${produto.id}">Preço unitário de custo 1</label>
                    <div class="campo-input-container com-prefixo">
                        <span class="input-prefixo">R$</span>
                        <input
                            type="text"
                            inputmode="decimal"
                            id="p1-${produto.id}"
                            class="campo-input"
                            data-campo="preco1"
                            placeholder="5,50"
                            value="${produto.preco1 || ''}"
                            ${isSalvo ? 'disabled' : ''}
                        >
                    </div>
                </div>

                <div class="campo" style="margin-top: 0.75rem;">
                    <label class="campo-label" for="pv-${produto.id}">Preço unitário de venda 1</label>
                    <div class="campo-input-container com-prefixo">
                        <span class="input-prefixo">R$</span>
                        <input
                            type="text"
                            inputmode="decimal"
                            id="pv-${produto.id}"
                            class="campo-input"
                            data-campo="precoVenda"
                            placeholder="8,50"
                            value="${produto.precoVenda || ''}"
                            ${isSalvo ? 'disabled' : ''}
                        >
                    </div>
                </div>

                <div id="margem-tempo-real-${produto.id}" style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; margin-top: 0.5rem; display: none;">
                    Margem calculada: <span class="txt-margem" style="color: var(--primary);">+0%</span>
                </div>

                <div class="subtotal-bloco" style="margin-top: 0.875rem;">
                    <span class="subtotal-label">Subtotal Custo</span>
                    <span class="subtotal-valor" data-saida="subtotal1">${formatarMoeda(calcSubtotal(produto.preco1, produto.quantidade))}</span>
                </div>
            </div>

            <div class="produto-card-rodape" style="margin-top: 1.25rem; display: flex; justify-content: flex-end;">
                <button type="button" class="btn-card-salvar" data-acao="toggle-salvar" style="padding: 0.625rem 1.25rem; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.875rem; font-weight: 700; border: none; border-radius: 10px; cursor: pointer; transition: all 0.2s; background: ${isSalvo ? '#f1f5f9' : 'var(--primary)'}; color: ${isSalvo ? 'var(--text-muted)' : '#ffffff'}; border: ${isSalvo ? '1.5px solid #cbd5e1' : 'none'}; box-shadow: ${isSalvo ? 'none' : '0 4px 10px rgba(79, 70, 229, 0.2)'};">
                    ${isSalvo ? 'Editar Item' : 'Salvar Item'}
                </button>
            </div>
        `;

        // Executa o cálculo da margem se os valores já vierem preenchidos no load
        setTimeout(() => {
            atualizarMargemCardRealTime(card, produto.id);
        }, 50);

        // Listeners dos inputs
        card.querySelectorAll('input[data-campo]').forEach(input => {
            input.addEventListener('input', (e) => {
                const campo = e.target.dataset.campo;
                produto[campo] = e.target.value;

                // Autocompletar preço de referência ao selecionar ou digitar nome correspondente
                if (campo === 'nome') {
                    const termo = e.target.value.trim().toLowerCase();
                    const correspondencia = catalogo.find(item => item.nome.toLowerCase() === termo);
                    const refContainer = card.querySelector(`#ref-container-${produto.id}`);
                    if (correspondencia) {
                        const custoVal = (correspondencia.precoCusto && paraNumero(correspondencia.precoCusto) > 0) ? correspondencia.precoCusto : correspondencia.preco1;
                        produto.preco1 = custoVal;
                        produto.precoVenda = correspondencia.preco1; // Preço de venda padrão
                        
                        const inputP1 = card.querySelector(`#p1-${produto.id}`);
                        const inputPv = card.querySelector(`#pv-${produto.id}`);
                        if (inputP1) inputP1.value = custoVal;
                        if (inputPv) inputPv.value = correspondencia.preco1;
                        
                        if (refContainer) {
                            const margemTxt = (correspondencia.precoCusto && correspondencia.preco1) ? calcularMargem(correspondencia.precoCusto, correspondencia.preco1) : '';
                            refContainer.innerHTML = `
                                <div class="referencia-precos-card" style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; margin-top: 0.5rem; margin-bottom: 0.25rem; display: flex; gap: 0.625rem; background: #f8fafc; padding: 0.375rem 0.625rem; border-radius: 8px; border: 1px solid #f1f5f9; flex-wrap: wrap;">
                                    <span>Custo ref: <strong style="color: var(--success);">${formatarMoeda(paraNumero(correspondencia.precoCusto))}</strong></span>
                                    <span>Venda ref: <strong style="color: var(--primary);">${formatarMoeda(paraNumero(correspondencia.preco1))}</strong>${margemTxt}</span>
                                </div>
                            `;
                        }
                    } else {
                        if (refContainer) {
                            refContainer.innerHTML = '';
                        }
                    }
                }

                if (campo === 'preco1' || campo === 'precoVenda') {
                    atualizarMargemCardRealTime(card, produto.id);
                }

                atualizarSubtotaisCard(card, produto);
                salvar();
                resultadoEl.classList.add('oculto');
            });
        });

        // Botão Salvar / Editar
        card.querySelector('[data-acao="toggle-salvar"]').addEventListener('click', () => {
            const novoEstado = !produto.salvo;
            
            if (novoEstado) {
                if (!produto.nome || !produto.nome.trim()) {
                    mostrarToast('Por favor, digite o nome do produto.', 'aviso');
                    return;
                }
                if (!produto.quantidade || paraNumero(produto.quantidade) <= 0) {
                    mostrarToast('Por favor, informe uma quantidade válida maior que 0.', 'aviso');
                    return;
                }
                if (!produto.preco1 || paraNumero(produto.preco1) <= 0) {
                    mostrarToast('Por favor, informe o preço esperado.', 'aviso');
                    return;
                }
            }

            produto.salvo = novoEstado;
            salvar();
            
            if (produto.salvo) {
                mostrarToast(`"${produto.nome}" salvo com sucesso!`, 'sucesso');
            } else {
                mostrarToast(`"${produto.nome}" desbloqueado para edição.`, 'info');
            }
            
            renderizarLista();
        });

        // Botão remover
        card.querySelector('[data-acao="remover"]').addEventListener('click', () => {
            if (produto.salvo) return;
            removerProduto(produto.id);
        });

        return card;
    }

    function escaparHtml(texto) {
        if (!texto) return '';
        return String(texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function calcSubtotal(preco, quantidade) {
        return paraNumero(preco) * paraNumero(quantidade);
    }

    function atualizarSubtotaisCard(card, produto) {
        const sub1 = calcSubtotal(produto.preco1, produto.quantidade);
        const sub2 = calcSubtotal(produto.preco2, produto.quantidade);
        card.querySelector('[data-saida="subtotal1"]').textContent = formatarMoeda(sub1);
    }

    /* ----------- Ações ----------- */

    function adicionarProduto() {
        const novo = {
            id: proximoId++,
            nome: '',
            quantidade: '',
            preco1: '',
            preco2: '',
            salvo: false
        };
        produtos.push(novo);
        salvar();
        renderizarLista();
        resultadoEl.classList.add('oculto');

        mostrarToast('Produto adicionado à lista.', 'sucesso');

        // Foca no campo nome do novo produto
        setTimeout(() => {
            const input = document.getElementById('nome-' + novo.id);
            if (input) {
                input.focus();
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);
    }

    function removerProduto(id) {
        produtos = produtos.filter(p => p.id !== id);
        salvar();
        renderizarLista();
        resultadoEl.classList.add('oculto');
        mostrarToast('Produto removido.', 'info');
    }

    function calcularSomaTotal() {
        if (produtos.length === 0) {
            mostrarToast('Adicione pelo menos um produto para calcular o total.', 'aviso');
            return;
        }

        let totalEsperado = 0;
        let totalAtual = 0;

        produtos.forEach(p => {
            totalEsperado += calcSubtotal(p.preco1, p.quantidade);
            totalAtual += calcSubtotal(p.preco2, p.quantidade);
        });

        const diferenca = totalAtual - totalEsperado;
        const absDiferenca = Math.abs(diferenca);

        let classeDiff = 'igual';
        let textoDiff = 'Os valores são iguais';
        let icone = '=';

        if (diferenca > 0.005) {
            classeDiff = 'mais-caro';
            icone = '↑';
            textoDiff = `Está ${formatarMoeda(absDiferenca)} mais caro`;
        } else if (diferenca < -0.005) {
            classeDiff = 'mais-barato';
            icone = '↓';
            textoDiff = `Está ${formatarMoeda(absDiferenca)} mais barato`;
        }

        resultadoConteudo.innerHTML = `
            <div class="resultado-linha">
                <span class="resultado-rotulo">Total esperado (Preço 1)</span>
                <span class="resultado-valor cor-1">${formatarMoeda(totalEsperado)}</span>
            </div>
            <div class="resultado-linha">
                <span class="resultado-rotulo">Total atual (Preço 2)</span>
                <span class="resultado-valor cor-2">${formatarMoeda(totalAtual)}</span>
            </div>
            <div class="resultado-diferenca ${classeDiff}">
                <span class="diferenca-icone">${icone}</span>
                ${textoDiff}
            </div>
        `;

        resultadoEl.classList.remove('oculto');
        resultadoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function limparTudo() {
        if (produtos.length === 0) {
            resultadoEl.classList.add('oculto');
            return;
        }
        
        const decisao = await abrirConfirmacaoModal();
        if (!decisao) return; // cancelado

        if (decisao === 'arquivar') {
            arquivarListaAtual();
        }

        produtos = [];
        proximoId = 1;
        salvar();
        renderizarLista();
        resultadoEl.classList.add('oculto');
        mostrarToast(decisao === 'arquivar' ? 'Lista salva no histórico e limpa!' : 'Lista limpa.', 'info');
    }

    /* ----------- Modo Lista (caderninho) ----------- */

    function abrirModoLista() {
        modoEdicao.classList.add('oculto');
        modoLista.classList.remove('oculto');
        atualizarDataLista();
        renderizarCaderno();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function voltarParaEdicao() {
        modoLista.classList.add('oculto');
        modoEdicao.classList.remove('oculto');
        renderizarLista();
    }

    function atualizarDataLista() {
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, '0');
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        listaData.textContent = `${dia}/${mes}`;
    }

    function renderizarCaderno() {
        cadernoItens.innerHTML = '';
        cadernoRodape.innerHTML = '';

        if (produtos.length === 0) {
            const vazio = document.createElement('div');
            vazio.className = 'caderno-vazio';
            vazio.textContent = 'Sua lista está vazia. Volte e adicione produtos.';
            cadernoItens.appendChild(vazio);
            return;
        }

        produtos.forEach((produto, indice) => {
            cadernoItens.appendChild(criarItemCaderno(produto, indice));
        });

        renderizarRodapeCaderno();
    }

    function criarItemCaderno(produto, indice) {
        const item = document.createElement('div');
        item.className = 'item-caderno';
        item.dataset.id = produto.id;

        const correspondencia = catalogo.find(item => item.nome.toLowerCase() === (produto.nome || '').trim().toLowerCase());
        const precoVendaRef = correspondencia ? correspondencia.preco1 : (produto.precoVenda || null);

        const nome = produto.nome && produto.nome.trim()
            ? escaparHtml(produto.nome.trim())
            : `Produto ${indice + 1}`;
        const semNome = !(produto.nome && produto.nome.trim());

        const qtd = paraNumero(produto.quantidade);
        const p1 = paraNumero(produto.preco1);
        const p2 = paraNumero(produto.preco2);
        const sub1 = p1 * qtd;
        const sub2 = p2 * qtd;

        const temP1 = produto.preco1 && p1 > 0;
        const temP2 = produto.preco2 && p2 > 0;

        item.innerHTML = `
            <div class="item-cabecalho">
                <div style="display: flex; flex-direction: column;">
                    <span class="item-nome ${semNome ? 'sem-nome' : ''}">${nome}</span>
                    ${precoVendaRef ? `<span style="font-size: 0.75rem; color: var(--text-light); font-weight: 700; margin-top: 0.125rem;">Venda ref: ${formatarMoeda(paraNumero(precoVendaRef))}</span>` : ''}
                </div>
                <span class="item-qtd">${qtd > 0 ? qtd + ' un' : '— un'}</span>
            </div>
            <div class="item-precos">
                <div class="preco-bloco preco-1 ${temP1 ? '' : 'vazio'}">
                    <div class="preco-bloco-titulo">Custo Esp.</div>
                    <div class="preco-unitario-pequeno">${temP1 ? formatarMoeda(p1) + '/un' : '—'}</div>
                    <div class="preco-subtotal" data-saida="caderno-sub1">${temP1 && qtd > 0 ? formatarMoeda(sub1) : '—'}</div>
                </div>
                <div class="preco-bloco preco-2 ${temP2 ? '' : 'vazio'}">
                    <div class="preco-bloco-titulo">No mercado</div>
                    <div class="input-mercado-container ${temP2 ? 'preenchido-container' : ''}">
                        <span class="input-prefixo">R$</span>
                        <input
                            type="text"
                            inputmode="decimal"
                            class="input-mercado ${temP2 ? 'preenchido' : ''}"
                            placeholder="0,00"
                            data-campo="preco2"
                            value="${produto.preco2 || ''}"
                        >
                    </div>
                    <div class="preco-subtotal" data-saida="caderno-sub2">${temP2 && qtd > 0 ? formatarMoeda(sub2) : '—'}</div>
                </div>
            </div>
            <div class="item-comparacao-area" data-saida="comparacao"></div>
        `;

        // Renderiza a comparação inicial
        atualizarComparacaoItem(item, produto);

        const inputMercado = item.querySelector('.input-mercado');
        const containerMercado = item.querySelector('.input-mercado-container');
        
        inputMercado.addEventListener('input', (e) => {
            produto.preco2 = e.target.value;
            salvar();

            const novoP2 = paraNumero(e.target.value);
            const novoSub2 = novoP2 * paraNumero(produto.quantidade);
            const saidaSub2 = item.querySelector('[data-saida="caderno-sub2"]');
            const blocoP2 = item.querySelector('.preco-bloco.preco-2');

            if (e.target.value && novoP2 > 0) {
                e.target.classList.add('preenchido');
                containerMercado.classList.add('preenchido-container');
                blocoP2.classList.remove('vazio');
                saidaSub2.textContent = paraNumero(produto.quantidade) > 0
                    ? formatarMoeda(novoSub2)
                    : '—';
            } else {
                e.target.classList.remove('preenchido');
                containerMercado.classList.remove('preenchido-container');
                blocoP2.classList.add('vazio');
                saidaSub2.textContent = '—';
            }

            atualizarComparacaoItem(item, produto);
            renderizarRodapeCaderno();
        });

        return item;
    }

    function atualizarComparacaoItem(item, produto) {
        const area = item.querySelector('[data-saida="comparacao"]');
        if (!area) return;

        const qtd = paraNumero(produto.quantidade);
        const p1 = paraNumero(produto.preco1);
        const p2 = paraNumero(produto.preco2);
        const temP1 = produto.preco1 && p1 > 0;
        const temP2 = produto.preco2 && p2 > 0;

        // Só compara quando tem os dois preços e a quantidade
        if (!temP1 || !temP2 || qtd <= 0) {
            area.innerHTML = '';
            return;
        }

        const sub1 = p1 * qtd;
        const sub2 = p2 * qtd;
        const diff = sub2 - sub1;
        const absDiff = Math.abs(diff);

        let classe = 'igual';
        let icone = '=';
        let texto = 'Mesmo preço';

        if (diff > 0.005) {
            classe = 'mais-caro';
            icone = '↑';
            texto = `Mais caro · ${formatarMoeda(absDiff)}`;
        } else if (diff < -0.005) {
            classe = 'economizou';
            icone = '↓';
            texto = `Economizou · ${formatarMoeda(absDiff)}`;
        }

        area.innerHTML = `
            <div class="item-comparacao ${classe}">
                <span class="icone-comp">${icone}</span>
                ${texto}
            </div>
        `;
    }

    function renderizarRodapeCaderno() {
        let totalEsperado = 0;
        let totalAtual = 0;
        let temAlgumP2 = false;

        produtos.forEach(p => {
            totalEsperado += calcSubtotal(p.preco1, p.quantidade);
            const sub2 = calcSubtotal(p.preco2, p.quantidade);
            totalAtual += sub2;
            if (p.preco2 && paraNumero(p.preco2) > 0) temAlgumP2 = true;
        });

        let html = `
            <div class="resultado-linha">
                <span class="resultado-rotulo">Total esperado</span>
                <span class="resultado-valor cor-1">${formatarMoeda(totalEsperado)}</span>
            </div>
            <div class="resultado-linha">
                <span class="resultado-rotulo">Total no mercado</span>
                <span class="resultado-valor cor-2">${temAlgumP2 ? formatarMoeda(totalAtual) : '—'}</span>
            </div>
        `;

        if (temAlgumP2) {
            const diferenca = totalAtual - totalEsperado;
            const absDiferenca = Math.abs(diferenca);
            let classeDiff = 'igual';
            let textoDiff = 'Os valores são iguais';
            let icone = '=';

            if (diferenca > 0.005) {
                classeDiff = 'mais-caro';
                icone = '↑';
                textoDiff = `Está ${formatarMoeda(absDiferenca)} mais caro`;
            } else if (diferenca < -0.005) {
                classeDiff = 'mais-barato';
                icone = '↓';
                textoDiff = `Está ${formatarMoeda(absDiferenca)} mais barato`;
            }

            html += `
                <div class="resultado-diferenca ${classeDiff}">
                    <span class="diferenca-icone">${icone}</span>
                    ${textoDiff}
                </div>
            `;
        }

        cadernoRodape.innerHTML = html;
    }

    /* ----------- Inicialização ----------- */

    carregarCatalogo();
    carregarHistorico();

    btnAdicionar.addEventListener('click', adicionarProduto);
    btnSomaTotal.addEventListener('click', calcularSomaTotal);
    btnLimpar.addEventListener('click', limparTudo);
    btnVerLista.addEventListener('click', abrirModoLista);
    btnVoltarEdicao.addEventListener('click', voltarParaEdicao);

    // Carrega dados salvos ou inicia com 1 produto
    if (!carregar()) {
        adicionarProduto();
    } else {
        renderizarLista();
    }

    // Registra o service worker para funcionar offline
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('service-worker.js').catch(() => {
                // Ignora se falhar
            });
        });
    }
})();

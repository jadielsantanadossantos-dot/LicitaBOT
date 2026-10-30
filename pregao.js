let contador_falhas_pregao = 0;
let contador_falhas_janela_lances = 0;
let flag_pregao = true;
let flag_mensagem = true;
let flag_lances = true;
let flag_aba_paginada = true;
let flag_modal_aberta = false;
let id_timeout_lances = null;
let ultimo_id_pregao = 0;
let contador_itens_atualizados = 0;
let contador_itens_final = 0;
let index_atual_aba = 0;
let id_timeout_aba = null;
let url_atualizacao_lances_atual = "";
let tempo_atualizacao_lances_atual = 7000;
let tempo_atualizacao_aba_atual = 7000;
let id_licitacao_atual = 0;
let flag_pregao_antigas = true;
let traz_pregao_antigas = true;
let limite_mensagens = 200;
let flag_status_pregao = true;

/** Fun��o que traz a conversa **/
function trazPregao(
  url_pagina_pregao,
  id_pregao,
  id_corrente,
  tempo_atualizacao,
) {
  if (flag_pregao) {
    flag_pregao = false;
    $.ajax({
      url: url_pagina_pregao,
      type: "GET",
      dataType: "json",
      data: "ttCD_LICITACAO=" + id_pregao + "&ttUltimoId=" + id_corrente,
      cache: false,
      success: function (data, textStatus) {
        contador_falhas_pregao = 0;

        flag_pregao = true;
        flag_alerta_sonoro = false;
        if (data != null && textStatus == "success") {
          let html = "";
          let numRetorno = data.mensagens.length;

          if (numRetorno > 0) {
            let contador_frases = 1;

            $.each(data.mensagens, function (i, obj) {
              let classe =
                obj.nome.charAt() === "S"
                  ? "chatBGI001"
                  : obj.nome.charAt() === "F"
                    ? "chatBGI002"
                    : "chatBGI003";
              html +=
                "<p class='" +
                classe +
                "'>" +
                obj.data +
                " " +
                obj.hora +
                " - " +
                obj.nome +
                " - " +
                obj.mensagem +
                "<input type='hidden' name='id' class='chatId' value='" +
                obj.id +
                "' /></p>";

              contador_frases++;

              if (Number(obj.id) > ultimo_id_pregao)
                ultimo_id_pregao = Number(obj.id);
            });

            let mem_scroll_bottom = obterPosicaoScroll(
              $(".stepResultScroll"),
              0,
            );

            $(".stepResultScroll").prepend(html);
            if ($(".stepResultScroll").scrollTop() <= 10)
              $(".stepResultScroll").scrollTop(0);
            else
              $(".stepResultScroll").scrollTop(
                $(".stepResultScroll").get(0).scrollHeight - mem_scroll_bottom,
              );
            html = "";
          }

          if (numRetorno >= 200) {
            if ($(".vermaisChat").length <= 0)
              $(".stepResultScroll").append(
                "<p class='chatBGI001 vermaisChat'><a href='#'>Ver mais mensagens</a></p>",
              );
            if (traz_pregao_antigas) {
              $(".stepResultScroll .vermaisChat a").live("click", function (e) {
                e.preventDefault();
                trazPregaoAntigas(
                  url_pagina_pregao,
                  id_pregao,
                  ".stepResultScroll",
                );
              });
              traz_pregao_antigas = false;
            }
          }

          if (data.permissaoMensagem == "false") $(".formSendResults").hide();
          else $(".formSendResults").show();
        }
        setTimeout(function () {
          trazPregao(
            url_pagina_pregao,
            id_pregao,
            ultimo_id_pregao,
            tempo_atualizacao,
          );
        }, tempo_atualizacao);
        atualizarHoraUltimaAtualizacaoChat();
      },
      error: function (errObj) {
        flag_pregao = true;
        setTimeout(function () {
          trazPregao(
            url_pagina_pregao,
            id_pregao,
            ultimo_id_pregao,
            tempo_atualizacao,
          );
        }, tempo_atualizacao);
      },
    });
  }
}

//Ao acontecer muitos erros consecutivos ao exibir o htmlAba, apresentar uma tela avisando sobre a atualiza��o da tela de sess�o
function exibirMensagemTelaSessao() {
  try {
    construirCaixaMensagemRecargaPagina("errorBlock", true);

    let textErrorMessage =
      "A p�gina n�o foi atualizada automaticamente. Sua conex�o pode estar inst�vel. ";

    if ($(".errorBlock #liveSessionMessage").length > 0)
      $(".errorBlock #liveSessionMessage").text(textErrorMessage);
    else
      $(".errorBlock #errorTitle").after(
        '<span id="liveSessionMessage" class="messageError">' +
        textErrorMessage +
        "</span>",
      );
  } catch (e) {
    console.error(e)
    $(".errorBlock").remove();
  }
}

function construirCaixaMensagemRecargaPagina(classeMensagem, linkParaRecarga) {
  if ($("." + classeMensagem).length <= 0) {
    let htmlCaixaRecarga =
      '<div class="' +
      classeMensagem +
      '">' +
      '<span id="errorTitle">Aten��o! </span>' +
      (linkParaRecarga
        ? '<a id="linkRefresh" href="javascript: document.location.reload(true);">Clique aqui para recarregar a p�gina</a>'
        : "") +
      "</div>";

    $(".operationsBlock").before(htmlCaixaRecarga);
  }
}

function removerCaixaMensagemRecargaPagina(classeMensagem) {
  if ($("." + classeMensagem).length > 0) {
    $("." + classeMensagem).remove();
  }
}

function exibirMensagemAlerta(mensagemAlerta, tipoAlerta) {
  try {
    construirCaixaMensagemRecargaPagina("alertBlock", false);

    let idTimeoutAlertBlock = $(".alertBlock").data("timeout");

    if (idTimeoutAlertBlock != undefined) clearTimeout(idTimeoutAlertBlock);

    $(".alertBlock")
      .removeClass("alerta")
      .removeClass("aviso")
      .addClass(tipoAlerta);

    if ($(".alertBlock #chatMessage").length > 0)
      $(".alertBlock #chatMessage").text(mensagemAlerta);
    else
      $(".alertBlock #errorTitle").after(
        '<span id="chatMessage" class="messageError">' +
        mensagemAlerta +
        "</span>",
      );

    idTimeoutAlertBlock = setTimeout(function () {
      $(".alertBlock").remove();
    }, 10000);

    $(".alertBlock").data("timeout", idTimeoutAlertBlock);
  } catch (e) {
    console.error(e)
    $(".alertBlock").remove();
  }
}

function gerenciarCaixaMensagemAlerta(exibir, mensagem) {
  if (exibir) {
    if ($(".alertBlock").length <= 0) {
      let htmlCaixaRecarga =
        '<div class="alertBlock aviso">' +
        '<span class="alert">' +
        mensagem +
        "</span>" +
        "</div>";
      $(".operationsBlock").before(htmlCaixaRecarga);
    }
  } else {
    $(".alertBlock").remove();
  }
}

/** Fun��o que traz a conversa **/
function trazPregao2(
  url_pagina_pregao,
  id_pregao,
  id_corrente,
  tempo_atualizacao,
) {
  if (flag_pregao) {
    flag_pregao = false;
    $.ajax({
      url: url_pagina_pregao,
      type: "get",
      dataType: "json",
      data: "ttCD_LICITACAO=" + id_pregao + "&ttUltimoId=" + id_corrente,
      cache: false,
      success: function (data, textStatus) {
        contador_falhas_pregao = 0;

        flag_pregao = true;
        flag_alerta_sonoro = false;
        if (data != null && textStatus == "success") {
          let html = "";
          let numRetorno = data.mensagens.length;

          if (numRetorno > 0) {
            let contador_frases = 1;

            $.each(data.mensagens, function (i, obj) {
              html +=
                "<p" +
                (obj.classe == "" ? "" : " class='" + obj.classe + "'") +
                ">" +
                obj.data +
                " " +
                obj.hora +
                " - " +
                obj.nome +
                " - " +
                obj.mensagem +
                "<input type='hidden' name='id' class='chatId' value='" +
                obj.id +
                "' /></p>";

              contador_frases++;

              if (Number(obj.id) > ultimo_id_pregao)
                ultimo_id_pregao = Number(obj.id);
            });

            let mem_scroll_bottom = obterPosicaoScroll(
              $(".stepResultScroll2"),
              0,
            );

            $(".stepResultScroll2").prepend(html);
            if ($(".stepResultScroll2").scrollTop() <= 10)
              $(".stepResultScroll2").scrollTop(0);
            else
              $(".stepResultScroll2").scrollTop(
                $(".stepResultScroll2").get(0).scrollHeight - mem_scroll_bottom,
              );
            html = "";
          }

          if (numRetorno >= 200) {
            if ($(".vermaisChat").length <= 0)
              $(".stepResultScroll2").append(
                "<p class='chatBGI001 vermaisChat'><a href='#'>Ver mais mensagens</a></p>",
              );
            if (traz_pregao_antigas) {
              $(".stepResultScroll2 .vermaisChat a").live(
                "click",
                function (e) {
                  e.preventDefault();
                  trazPregaoAntigas(
                    url_pagina_pregao,
                    id_pregao,
                    ".stepResultScroll2",
                  );
                },
              );
              traz_pregao_antigas = false;
            }
          }

          if (data.permissaoMensagem == "false") $(".envioMensagem").hide();
          else $(".envioMensagem").show();
        }
        setTimeout(function () {
          trazPregao2(
            url_pagina_pregao,
            id_pregao,
            ultimo_id_pregao,
            tempo_atualizacao,
          );
        }, tempo_atualizacao);
        atualizarHoraUltimaAtualizacaoChat();
      },
      error: function () {
        //console.log("Erro ao receber mensagem");
        flag_pregao = true;
        if (contador_falhas_pregao >= 5) {
          contador_falhas_pregao = 0;
          location.href = "/";
          //alert("Erro ao obter o preg�o");
          window.close();
        } else {
          contador_falhas_pregao++;
          setTimeout(function () {
            trazPregao2(
              url_pagina_pregao,
              id_pregao,
              ultimo_id_pregao,
              tempo_atualizacao,
            );
          }, tempo_atualizacao);
        }
      },
    });
  }
}

function obterStatusPregao(url_pagina_status, id_pregao, tempo_atualizacao) {
  if (flag_status_pregao) {
    flag_status_pregao = false;
    $.ajax({
      url: url_pagina_status,
      type: "GET",
      dataType: "text",
      data: "ttCD_LICITACAO=" + id_pregao,
      cache: false,
      success: function (data, textStatus) {
        flag_status_pregao = true;
        if (data != null && data != "" && textStatus == "success") {
          $(".operationsBlock .operationTitle").html(data);
        }
        setTimeout(function () {
          obterStatusPregao(url_pagina_status, id_pregao, tempo_atualizacao);
        }, tempo_atualizacao);
      },
      error: function () {
        flag_status_pregao = true;
        setTimeout(function () {
          obterStatusPregao(url_pagina_status, id_pregao, tempo_atualizacao);
        }, tempo_atualizacao);
      },
    });
  }
}

function trazPregaoAntigas(url_pagina_pregao, id_pregao, classe_mensagens) {
  if (flag_pregao_antigas && $(".stepResultScroll p").length > 0) {
    $(".vermaisChat").text("Carregando...");
    flag_pregao_antigas = false;
    $.ajax({
      url: url_pagina_pregao,
      type: "GET",
      dataType: "json",
      data:
        "ttCD_LICITACAO=" +
        id_pregao +
        "&ttUltimoId=" +
        $("input.chatId:last").val() +
        "&ttInverso=1",
      cache: false,
      success: function (data, textStatus) {
        contador_falhas_pregao = 0;

        flag_pregao_antigas = true;
        flag_alerta_sonoro = false;
        if (data != null && textStatus == "success") {
          let html = "";
          let numRetorno = data.mensagens.length;

          if (numRetorno > 0) {
            let contador_frases = 1;

            $.each(data.mensagens, function (i, obj) {
              let classe =
                obj.nome.charAt() === "S"
                  ? "chatBGI001"
                  : obj.nome.charAt() === "F"
                    ? "chatBGI002"
                    : "chatBGI003";
              html +=
                "<p class='" +
                classe +
                "'>" +
                obj.data +
                " " +
                obj.hora +
                " - " +
                obj.nome +
                " - " +
                obj.mensagem +
                "<input type='hidden' name='id' class='chatId' value='" +
                obj.id +
                "' /></p>";

              contador_frases++;
            });

            $(classe_mensagens).append(html);
            html = "";
          }
          $(".vermaisChat").remove();

          if (numRetorno >= limite_mensagens)
            $(classe_mensagens).append(
              "<p class='chatBGI001 vermaisChat'><a href='#'>Ver mais mensagens</a></p>",
            );
          $(".formSendResults").show();
        }
        atualizarHoraUltimaAtualizacaoChat();
      },
      error: function (errObj) {
        flag_pregao_antigas = true;
      },
    });
  }
}

function gravarMensagem(url_pagina_postar, id_pregao, texto) {
  if (texto != "" && flag_mensagem) {
    flag_mensagem = false;
    $.ajax({
      url: url_pagina_postar,
      type: "post",
      data: "ttMENSAGEM=" + $.URLEncode(texto) + "&ttCD_LICITACAO=" + id_pregao,
      dataType: "html",
      cache: false,
      beforeSend: function () {
        //$('#contato label').append('<img src="img/loader.gif" alt="Carregando..." class="loader" />');
      },
      success: function (data, textStatus) {
        $("#word").attr("value", "");
        if (data != "sucesso") modalAlert("Erro ao enviar mensagem");
        flag_mensagem = true;
      },
      error: function () {
        modalAlert("Erro ao enviar mensagem");
        flag_mensagem = true;
      },
    });
  }
}

function carregarConteudoAba(
  url_atualizacao_lances,
  tempo_atualizacao_lances,
  tempo_atualizacao_aba,
  CD_LICITACAO,
) {
  url_atualizacao_lances_atual = url_atualizacao_lances;
  tempo_atualizacao_lances_atual = tempo_atualizacao_lances;
  tempo_atualizacao_aba_atual = tempo_atualizacao_aba;
  id_licitacao_atual = CD_LICITACAO;

  $(".tabDataList li a").live("click", function (e) {
    e.preventDefault();

    clearTimeout(id_timeout_lances);

    $(this).parent().children("input").remove();

    let index_aba = $(this).data("param");
    let url_aba = $(this).attr("href");

    obterConteudoAba(
      url_aba,
      index_aba,
      url_atualizacao_lances,
      tempo_atualizacao_lances,
      CD_LICITACAO,
    );
  });
  verificarAtualizacaoAba(
    url_atualizacao_lances,
    tempo_atualizacao_lances,
    CD_LICITACAO,
  );

  id_timeout_aba = setInterval(
    verificarAtualizacaoAba,
    tempo_atualizacao_aba,
    url_atualizacao_lances,
    tempo_atualizacao_lances,
    CD_LICITACAO,
  );
}

function obterValorPaginaCorrente(seletorBase, valorPadrao) {
  if ($(seletorBase).length === 0) return valorPadrao;

  const seletorContainer = ".tabDataContainer " + seletorBase;
  if ($(seletorContainer).length > 0) {
    const valorContainer = $(seletorContainer).val();
    $(seletorContainer).remove();
    $(seletorBase).val(valorContainer);
    return valorContainer;
  }

  const valor = $(seletorBase).val();
  return valor === "" ? 1 : valor;
}

function obterConteudoAba(
  url_aba,
  index_aba,
  url_atualizacao_lances,
  tempo_atualizacao_lances,
  CD_LICITACAO,
) {
  let numPagina = 1;
  let numPaginaInternaLote = 1;

  if ($(".numeroPaginaInicial").length > 0) {
    numPagina = $(".numeroPaginaInicial").val();
    $(".numeroPaginaInicial").remove();
  }

  if ($(".numeroPaginaInternaLoteInicial").length > 0) {
    numPaginaInternaLote = $(".numeroPaginaInternaLoteInicial").val();
    $(".numeroPaginaInternaLoteInicial").remove();
  }

  if ($(".tipoLicitacao").val() == index_aba.toString()) {
    numPagina = obterValorPaginaCorrente(".numeroPaginaCorrente", numPagina);
    numPaginaInternaLote = obterValorPaginaCorrente(
      ".numeroPaginaInternaLoteCorrente",
      numPaginaInternaLote,
    );
  }

  obterConteudoAbaPaginada(
    url_aba,
    index_aba,
    url_atualizacao_lances,
    tempo_atualizacao_lances,
    CD_LICITACAO,
    numPagina,
    numPaginaInternaLote,
  );
}

function obterConteudoAbaPaginada(
  url_aba,
  index_aba,
  url_atualizacao_lances,
  tempo_atualizacao_lances,
  CD_LICITACAO,
  numPagina,
  numPaginaInternaLote,
) {
  if (flag_aba_paginada) {
    flag_aba_paginada = false;
    if ($(".loaderAba").length <= 0) {
      $(".tabTableBottomLinks").append(
        "<li><img class='loaderAba' alt='Carregando...' src='/4/img/loader.png' /></li>",
      );
    }

    let id_licitacao_aba = 0;

    try {
      if ($("#licitacaoAtual").length > 0)
        id_licitacao_aba = Number.parseFloat($("#licitacaoAtual").val());
    } catch (ex) {
      console.error(ex);
      id_licitacao_aba = CD_LICITACAO;
    } finally {
      if (id_licitacao_aba <= 0) id_licitacao_aba = CD_LICITACAO;
    }

    $.ajax({
      url: url_aba,
      type: "post",
      data:
        "param=" +
        index_aba +
        "&ttCD_LICITACAO=" +
        id_licitacao_aba +
        "&ttPagina=" +
        numPagina +
        "&ttPaginaItemLote=" +
        numPaginaInternaLote,
      dataType: "text",
      cache: false,
      timeout: 30000,
      success: function (data, textStatus) {
        flag_aba_paginada = true;
        try {
          if (data != "") {
            if (data.indexOf('"urlRedir":') > 0) {
              let objData = $.parseJSON(data);
              if (objData.urlRedir != "") {
                location.href = objData.urlRedir;
                return;
              }
            }

            //Flag para identificar se valores devem ser mantidos ao recarregar o conte�do
            let preservar_valores = true;
            let arr_valores = null;
            let nome_linha = "";

            //Verificar se a aba a ser carregada e a corrente s�o diferentes
            if (
              $("input[name=numeroPaginaCorrente]").length > 0 &&
              $("input[name=tipoLicitacao]").length > 0 &&
              ($(".tabTable input[name=numeroPaginaCorrente]").val() !=
                numPagina.toString() ||
                $(".tabTable input[name=tipoLicitacao]").val() !=
                index_aba.toString())
            )
              preservar_valores = false;

            //Obter valores anteriores
            if (preservar_valores) arr_valores = obterValoresAba();
            if ($("input[name=ttPRECO_UNITARIO]:focus").length > 0) {
              nome_linha = $("input[name=ttPRECO_UNITARIO]:focus")
                .parent()
                .parent()
                .parent()
                .parent()
                .parent()
                .attr("id");
            }

            //$(".tabDataBlock table:eq(0)").hide();
            let obj_tabelas = $(data);

            //Verificar se existem tabelas contendo informa��o dos lotes
            if ($(obj_tabelas, "table").length == 1) {
              if ($(".tabDataBlock table").length == 0) {
                $(".tabDataBlock").prepend(data);
              } else {
                $(".tabDataBlock table:eq(0)").replaceWith(data);
                $(".tabDataBlock table:gt(0)").remove();
              }
            } else {
              //Caso exista substituir as duas tabelas
              let lista_tabelas = $(obj_tabelas, "table");

              if ($(".tabDataBlock table").length < 2) {
                $(".tabDataBlock table").remove();
                $(".tabDataBlock").prepend(lista_tabelas.last());
                $(".tabDataBlock").prepend(lista_tabelas.first());
              } else {
                $(".tabDataBlock table:eq(0)")
                  .first()
                  .replaceWith(lista_tabelas.first());
                $(".tabDataBlock table:eq(1)").replaceWith(
                  lista_tabelas.last(),
                );
              }
            }

            //Escrever os valores informados anteriormente
            if (preservar_valores) escreverValoresAba(arr_valores);

            if (nome_linha != "") {
              setTimeout(function () {
                if ($("#" + nome_linha).length > 0) {
                  $("#" + nome_linha + " input[name=ttPRECO_UNITARIO]").focus();
                }
              }, 100);
            }

            /** TABLE SORTER **/
            $(".tabDataBlock table:eq(0)").tablesorter();

            //clearTimeout(id_timeout_lances);
            //atualizarLances(index_aba, url_atualizacao_lances, tempo_atualizacao_lances);
            reabrirModais($(".tabDataBlock table"));

            aplicarMascaras(".tabDataBlock table");
            //$(".tabDataBlock table:eq(0)").show();
            enviarFormularioViaAjaxLinha(".formInsertValue");

            if (
              $(".tabClosed").length > 0 &&
              $("input[name=lancesFechados]").length > 0
            ) {
              if ($("input[name=lancesFechados]").val() == "1")
                $(".tabClosed").addClass("tabAlert");
              else $(".tabClosed").removeClass("tabAlert");
            }

            if ($("input[name=propostaReadequada]").length > 0) {
              if ($("input[name=propostaReadequada]").val() == "1")
                controlarExibicaoBotao(
                  "#botaoOperacaoPropostaReadequada",
                  true,
                );
              else
                controlarExibicaoBotao(
                  "#botaoOperacaoPropostaReadequada",
                  false,
                );
            }

            if ($("input[name=envioDocumentos]").length > 0) {
              if ($("input[name=envioDocumentos]").val() == "1")
                controlarExibicaoBotao("#botaoOperacaoEnvioDocumentos", true);
              else
                controlarExibicaoBotao("#botaoOperacaoEnvioDocumentos", false);
            } else {
              controlarExibicaoBotao("#botaoOperacaoEnvioDocumentos", false);
            }

            if ($("input[name=diligenciaGlobal]").length > 0) {
              if ($("input[name=diligenciaGlobal]").val() == "1") {
                controlarExibicaoBotao("#botaoOperacaoDiligenciaGlobal", true);
              } else {
                controlarExibicaoBotao("#botaoOperacaoDiligenciaGlobal", false);
              }
            }
            else {
              controlarExibicaoBotao("#botaoOperacaoDiligenciaGlobal", false);
            }

            if ($("input[name=documentosPendentes]").length > 0) {
              if ($("input[name=documentosPendentes]").val() == "1")
                gerenciarCaixaMensagemAlerta(
                  true,
                  "Existem documentos pendentes de envio.",
                );
              else gerenciarCaixaMensagemAlerta(false, "");
            } else {
              gerenciarCaixaMensagemAlerta(false, "");
            }

            if ($("#chatDisponivel").val() == "1")
              controlarExibicaoBotao("#botaoChatFornecedor", true);
            else controlarExibicaoBotao("#botaoChatFornecedor", false);

            if (
              $(".operationsBlock a:not([style*='display: none'])").length > 3
            )
              $(".operationsBlock a").addClass("x4");
            else $(".operationsBlock a").removeClass("x4");

            apresentarBotoesFornecedores();
            processarTimer();
            ocultarLance();
          }

          contador_falhas_janela_lances = 0;
          if (contador_falhas_janela_lances === 0)
            removerCaixaMensagemRecargaPagina("errorBlock");
          atualizarHoraUltimaAtualizacaoTelaLances();

          if (obterVersaoChat() == 2)
            obtemMensagemChatV2($(".tokenChat").val(), 1, true);
        } catch (e) {
          //Problemas ao atualizar a aba de lances
          if (contador_falhas_janela_lances >= 1) {
            console.error(e)
            exibirMensagemTelaSessao();
          } else {
            contador_falhas_janela_lances++;
          }
        }
      },
      error: function (xml_http, error_status, error_obj) {
        flag_aba_paginada = true;
        //Problemas ao atualizar a aba de lances
        if (contador_falhas_janela_lances >= 1) {
          exibirMensagemTelaSessao();
        } else {
          contador_falhas_janela_lances++;
        }
      },
    });
  }
}

function obterVersaoChat() {
  return $("input[name=versaoChat]").val() == "2" ? 2 : 1;
}

function controlarExibicaoBotao(botao, exibir) {
  try {
    if (exibir) $(botao).show();
    else $(botao).hide();
  } catch (e) {
    console.error(e);
  }
}

function obterValoresAba() {
  if ($("input[name=ttPRECO_UNITARIO]").length > 0) {
    let arr_valores = new Array();
    $("input[name=ttPRECO_UNITARIO]").each(function () {
      let id_item = $(this)
        .parent()
        .parent()
        .find("input[name=slCD_ORIGEM]")
        .val();
      let valor_item = $(this).val();
      let arr_item = [id_item, valor_item];
      arr_valores.push(arr_item);
    });
    return arr_valores;
  } else {
    return null;
  }
}

function escreverValoresAba(arr_valores) {
  if ($("input[name=ttPRECO_UNITARIO]").length > 0 && arr_valores != null) {
    for (i = 0; i < arr_valores.length; i++) {
      if (
        $("input[name=slCD_ORIGEM][value=" + arr_valores[i][0] + "]").length > 0
      ) {
        let preco_unitario = $(
          "input[name=slCD_ORIGEM][value=" + arr_valores[i][0] + "]",
        )
          .parent()
          .find("input[name=ttPRECO_UNITARIO]");
        if (preco_unitario.length > 0) {
          preco_unitario.val(arr_valores[i][1]);
        }
      }
    }
  }
}

function apresentarBotoesFornecedores() {
  try {
    let flag_recursos_disponiveis = $("#recursosDisponiveis").val() == "1";
    let flag_contrarrazoes_disponiveis =
      $("#contrarrazoesDisponiveis").val() == "1";
    if (flag_recursos_disponiveis) $("#btRecursos").show();
    else $("#btRecursos").hide();
    if (flag_contrarrazoes_disponiveis) $("#btContrarrazao").show();
    else $("#btContrarrazao").hide();
  } catch (e) {
    console.error(e);
  }
}

function obterDadosFormularioPregao(obj_form) {
  let url_params = "";

  $(obj_form)
    .find("input[type!=submit], textarea")
    .each(function () {
      if (url_params != "") url_params += "&";
      url_params += $(this).attr("name") + "=" + $.URLEncode($(this).val());
    });

  return url_params;
}

function processarTimer() {
  try {
    let str_hora_atual = $("input[name=horaAtual]").val();
    let data_atual = new Date("01/01/2000 " + str_hora_atual);

    $("input[name=horaFechamento]").each(function () {
      let input_item = $(this);
      let str_hora_item = input_item.val();
      let data_item = new Date("01/01/2000 " + str_hora_item);
      let msec_regressiva = data_item - data_atual;

      if (msec_regressiva > 0) {
        let minutos_regressiva = Math.floor(msec_regressiva / 1000 / 60);
        msec_regressiva -= minutos_regressiva * 1000 * 60;
        let segundos_regressiva = Math.floor(msec_regressiva / 1000);
        let hora_regressiva =
          (minutos_regressiva < 10 ? "0" : "") +
          minutos_regressiva +
          ":" +
          (segundos_regressiva < 10 ? "0" : "") +
          segundos_regressiva;

        input_item.after(
          "<span class='timeItem" +
          (minutos_regressiva < 2 ? " alertTimeItem" : "") +
          "'>" +
          hora_regressiva +
          "</span>",
        );
      } else {
        input_item.after("<span>--</span>");
      }
    });

    $("input[name=horaInicio]").each(function () {
      let input_item = $(this);
      let str_hora_item = input_item.val();
      let data_item = new Date("01/01/2000 " + str_hora_item);
      let msec_progressiva = data_atual - data_item;

      if (msec_progressiva > 0) {
        const segundos = (data_atual.getTime() - data_item.getTime()) / 1000;
        const minutos = Math.floor(segundos / 60);
        const segundosRestantes = segundos - minutos * 60;
        let minutoFormatado = minutos.toString().padStart(2, "0");
        let segundoFormatado = segundosRestantes.toString().padStart(2, "0");
        let hora_progressiva = minutoFormatado + ":" + segundoFormatado;

        input_item.after(
          "<span class='timeItemProgressivo" +
          (minutos < 2 ? " alertTimeItemProgressivo" : "") +
          "'>" +
          hora_progressiva +
          "</span>",
        );
      } else {
        input_item.after("<span>--</span>");
      }
    });
  } catch (e) {
    console.error(e);
  }
}

function ocultarLance() {
  let str_hora_atual = $("input[name=horaAtual]").val();
  let data_atual = new Date("01/01/2000 " + str_hora_atual);

  $("div.cancelarLance").each(function () {
    let input_item = $(this);
    const horaInicioLance = input_item
      .find("input[name=horaInicioLance]")
      .val();
    const horaFimLance = input_item.find("input[name=horaFimLance]").val();

    const dataInicio = new Date("01/01/2000 " + horaInicioLance);
    const dataFim = new Date("01/01/2000 " + horaFimLance);

    const diferencaInicioMsec = data_atual - dataInicio;
    const diferencaFimMsec = dataFim - data_atual;

    if (diferencaInicioMsec >= 0 && diferencaFimMsec >= 0) {
      input_item.show();
      setTimeout(function () {
        input_item.hide();
      }, diferencaFimMsec);
    } else {
      input_item.hide();
    }
  });
}

function cancelarLance(urlPaginaOperacao, urlCancelamentoLances) {
  fetch(urlCancelamentoLances)
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      if (data.sucesso == "true") {
        abrirAlerta("Aten��o", "Lance cancelado com sucesso!");
        const observer = new MutationObserver(handleMutations);
        observer.observe(document.body, { childList: true });
        function handleMutations(mutations) {
          for (const mutation of mutations) {
            if (mutation.removedNodes.length > 0) {
              handleRemovedNodes(mutation.removedNodes, observer);
            }
          }
        }
        function handleRemovedNodes(removedNodes, observer) {
          for (const node of removedNodes) {
            if (node.className?.includes("shadeBlock")) {
              top.location.href = urlPaginaOperacao;
              observer.disconnect();
              break;
            }
          }
        }
      } else if (data.mensagem != "") {
        abrirAlerta("Aten��o", data.mensagem);
      }
    })
    .catch((error) => {
      console.error("Erro ao cancelar o lance:", error);
    });
}

function enviarFormularioViaAjaxLinha(seletor_form) {
  $(seletor_form).each(function () {
    let url_form = $(this).attr("action");
    let obj_form = $(this);

    $(this).validate({
      showErrors: function () {
        this.defaultShowErrors();
        $("label.error").remove();
        obj_form.find("*[class *= 'required']").each(function () {
          let attrCompare = $(this).attr("name");
          if ($(this).val() == "") {
            obj_form.find("label[for = '" + attrCompare + "']").css({
              /** Deve Ser Comentado Para Marcar o Campo ao Inv�s da Label **/
              color: "#f00",
              "text-shadow": "0px 0px 2px #f99",
            });
          } else {
            obj_form.find("label[for = '" + attrCompare + "']").css({
              /** Deve Ser Comentado Para Marcar o Campo ao Inv�s da Label **/
              color: "",
              "text-shadow": "",
            });
          }
        });
      },
      focusInvalid: false,
      onfocusout: false,
      onclick: false,
      onkeyup: false,
    });

    //Sinalizar o bot�o clicado para enviar o formul�rio
    $(seletor_form)
      .find("input[type=submit]")
      .each(function () {
        $(this).click(function () {
          if ($(this).closest("form").valid()) {
            $(this).attr("BOTAO_EVENTO", "SIM");
          }
        });
      });

    $(this).submit(function () {
      let preco_enviado = 0;
      let preco_atual = 0;
      let flag_enviar_lance = true;
      let mensagem_confirm =
        "Tem certeza que deseja submeter esse lance?</br>Lance: ";
      let mensagem_anterior_envio = "";
      let tipo_julgamento_licitacao = 0;
      let casas_decimais = 0;

      //Verificar se � preg�o progressivo
      if ($("input[name=julgamentoLicitacao]").length > 0) {
        tipo_julgamento_licitacao = Number.parseInt(
          $("input[name=julgamentoLicitacao]").val(),
        );
      }
      if ($("input[name=casasDecimais]").length > 0) {
        try {
          casas_decimais = Number.parseInt(
            $("input[name=casasDecimais]").val(),
          );
        } catch (e) {
          console.error(e)
          casas_decimais = 0;
        }
      }

      try {
        if (
          $(this).find("input[name=ttPRECO_UNITARIO]").length > 0 &&
          $(this).parent().parent().find("input[name=precoItem]").length > 0
        ) {
          const input_valor = $(this).find("input[name=ttPRECO_UNITARIO]");
          const valor_enviado = input_valor.maskMoney("unmasked")[0];
          const preco_enviado_exibicao = input_valor
            .val()
            .replaceAll("R$", "")
            .replaceAll("%", "")
            .trim();
          let str_preco_atual = $(this)
            .parent()
            .parent()
            .find("input[name=precoItem]")
            .val();

          const taxa =
            input_valor.hasClass("taxa2") ||
            input_valor.hasClass("taxa3") ||
            input_valor.hasClass("taxa4");
          const percentual = tipo_julgamento_licitacao == 3 || taxa;

          if (percentual) mensagem_confirm += preco_enviado_exibicao + "%";
          else mensagem_confirm += "R$ " + preco_enviado_exibicao;

          if (str_preco_atual.includes(",")) {
            str_preco_atual = str_preco_atual.replaceAll(".", "");
            str_preco_atual = str_preco_atual.replaceAll(",", ".");
          }

          preco_enviado = Number.parseFloat(valor_enviado);
          preco_atual = Number.parseFloat(str_preco_atual);

          if (Number.isNaN(preco_enviado) || (preco_enviado <= 0 && !taxa)) {
            modalAlert("Pre�o enviado � inv�lido.");
            flag_enviar_lance = false;
          } else if (
            tipo_julgamento_licitacao == 2 ||
            tipo_julgamento_licitacao == 3
          ) {
            if (
              preco_enviado != "" &&
              preco_atual != "" &&
              Number.parseFloat(preco_enviado) >
              Number.parseFloat(preco_atual) * 1.2
            ) {
              mensagem_anterior_envio =
                "Seu lance est� muito acima do anterior. Confirma o valor?</br>Lance: " +
                (percentual ? "" : "R$ ") +
                preco_enviado_exibicao +
                (percentual ? "%" : "");
            }
          } else if (
            preco_enviado != "" &&
            preco_atual != "" &&
            Number.parseFloat(preco_enviado) <
            Number.parseFloat(preco_atual) * 0.8
          ) {
            mensagem_anterior_envio =
              "Seu lance est� muito abaixo do anterior. Confirma o valor?</br>Lance: " +
              (percentual ? "" : "R$ ") +
              preco_enviado_exibicao +
              (percentual ? "%" : "");
          }
        }
      } catch (e) {
        console.error(e);
        modalAlert("Pre�o enviado � inv�lido.");
        flag_enviar_lance = false;
      }

      if (flag_enviar_lance) {
        clearTimeout(id_timeout_aba);
        clearTimeout(id_timeout_lances);

        let dados_formulario_envio = obterDadosFormularioPregao($(this));
        let obj_form_submit = $(this);

        $(this).find("input[name=ttPRECO_UNITARIO]").blur();

        let func_confirma_envio = function () {
          //Validar o formul�rio
          if (obj_form_submit.valid()) {
            let nomeBotaoSubmit = obj_form_submit
              .find("input[BOTAO_EVENTO=SIM]")
              .attr("name");

            if (
              obj_form_submit.find("input[BOTAO_EVENTO=SIM]").hasClass("reset")
            ) {
              obj_form_submit
                .find("input[type!=submit][type!=hidden], textarea")
                .val("");
            }

            obj_form_submit
              .find("input[BOTAO_EVENTO=SIM]")
              .attr("BOTAO_EVENTO", "");

            $.ajax({
              url: url_form,
              data: dados_formulario_envio + "&" + nomeBotaoSubmit + "=sim",
              dataType: "json",
              type: "post",
              success: function (retorno) {
                verificarIdGeralLicitacao();

                if (retorno != "") {
                  let manter_valores = false;
                  try {
                    if (retorno.manterValor)
                      manter_valores = retorno.manterValor;
                  } catch (e) {
                    console.error(e);
                    manter_valores = false;
                  }

                  if (retorno.mensagem != "") {
                    if (!manter_valores) {
                      obj_form_submit
                        .find("input[type!=submit][type!=hidden], textarea")
                        .val("");
                    }
                    modalAlert(retorno.mensagem);
                  }
                }
                let index_aba = $(".tabDataList .tabDataMarked a").data(
                  "param",
                );
                let url_aba = $(".tabDataList .tabDataMarked a").attr("href");

                obterConteudoAba(
                  url_aba,
                  index_aba,
                  url_atualizacao_lances_atual,
                  tempo_atualizacao_lances_atual,
                  id_licitacao_atual,
                );
                id_timeout_aba = setInterval(
                  verificarAtualizacaoAba,
                  tempo_atualizacao_aba_atual,
                  url_atualizacao_lances_atual,
                  tempo_atualizacao_lances_atual,
                  id_licitacao_atual,
                );
              },
              error: function () {
                verificarIdGeralLicitacao();

                let index_aba = $(".tabDataList .tabDataMarked a").data(
                  "param",
                );
                let url_aba = $(".tabDataList .tabDataMarked a").attr("href");

                obterConteudoAba(
                  url_aba,
                  index_aba,
                  url_atualizacao_lances_atual,
                  tempo_atualizacao_lances_atual,
                  id_licitacao_atual,
                );
                id_timeout_aba = setInterval(
                  verificarAtualizacaoAba,
                  tempo_atualizacao_aba_atual,
                  url_atualizacao_lances_atual,
                  tempo_atualizacao_lances_atual,
                  id_licitacao_atual,
                );
              },
            });
          } else {
            verificarIdGeralLicitacao();

            let index_aba = $(".tabDataList .tabDataMarked a").data("param");
            let url_aba = $(".tabDataList .tabDataMarked a").attr("href");

            obterConteudoAba(
              url_aba,
              index_aba,
              url_atualizacao_lances_atual,
              tempo_atualizacao_lances_atual,
              id_licitacao_atual,
            );
            id_timeout_aba = setInterval(
              verificarAtualizacaoAba,
              tempo_atualizacao_aba_atual,
              url_atualizacao_lances_atual,
              tempo_atualizacao_lances_atual,
              id_licitacao_atual,
            );
          }
        };

        let func_cancelar_envio = function () {
          verificarIdGeralLicitacao();

          obj_form_submit.find("input[name=ttPRECO_UNITARIO]").val("");

          let index_aba = $(".tabDataList .tabDataMarked a").data("param");
          let url_aba = $(".tabDataList .tabDataMarked a").attr("href");

          obterConteudoAba(
            url_aba,
            index_aba,
            url_atualizacao_lances_atual,
            tempo_atualizacao_lances_atual,
            id_licitacao_atual,
          );
          id_timeout_aba = setInterval(
            verificarAtualizacaoAba,
            tempo_atualizacao_aba_atual,
            url_atualizacao_lances_atual,
            tempo_atualizacao_lances_atual,
            id_licitacao_atual,
          );
        };

        let func_cancelar_envio_reverso = function () {
          verificarIdGeralLicitacao();

          let index_aba = $(".tabDataList .tabDataMarked a").data("param");
          let url_aba = $(".tabDataList .tabDataMarked a").attr("href");

          obterConteudoAba(
            url_aba,
            index_aba,
            url_atualizacao_lances_atual,
            tempo_atualizacao_lances_atual,
            id_licitacao_atual,
          );
          id_timeout_aba = setInterval(
            verificarAtualizacaoAba,
            tempo_atualizacao_aba_atual,
            url_atualizacao_lances_atual,
            tempo_atualizacao_lances_atual,
            id_licitacao_atual,
          );
        };

        if (mensagem_anterior_envio) {
          modalConfirmExcecao(
            mensagem_anterior_envio,
            "enterReverso",
            function () {
              modalConfirm(
                mensagem_confirm,
                func_confirma_envio,
                func_cancelar_envio,
              );
            },
            func_cancelar_envio_reverso,
          );
        } else
          modalConfirm(
            mensagem_confirm,
            func_confirma_envio,
            func_cancelar_envio,
          );
      }

      return false;
    });
  });
}

function verificarIdGeralLicitacao() {
  try {
    if (id_licitacao_atual == "" || Number.isNaN(id_licitacao_atual)) {
      id_licitacao_atual = Number.parseFloat($("#licitacaoAtual").val());
    }
  } catch (e) {
    console.error(e);
  }
}

function verificarAtualizacaoAba(
  url_atualizacao_lances,
  tempo_atualizacao_lances,
  CD_LICITACAO,
) {
  if (
    !flag_modal_aberta &&
    ($(".tabDataBlock .toolTipListBlock").length == 0 ||
      $(".tabDataBlock .toolTipListBlock:visible").length > 0)
  ) {
    let index_inicial = 0;

    if ($(".tabDataList li.tabDataMarked a").length > 0) {
      index_inicial = $(".tabDataList li.tabDataMarked a").data("param");
    }
    obterConteudoAba(
      $(".tabDataList li.tabDataMarked a").attr("href"),
      index_inicial,
      url_atualizacao_lances,
      tempo_atualizacao_lances,
      CD_LICITACAO,
    );
  }
}

function excluirLance(url_exclusao, id_lance, obj_link) {
  modalConfirm(
    "Deseja excluir o lance?",
    function () {
      $.ajax({
        url: url_exclusao,
        type: "post",
        dataType: "text",
        cache: false,
        data: "ttCD_LANCE=" + id_lance,
        success: function (data, textStatus) {
          if (data != "") {
            $(obj_link).parent().remove();
            modalAlert("Lance exclu�do");
          }
        },
        error: function () { },
      });
    },
    null,
    null,
  );
}

/*function atualizarLances(index_aba, url_atualizacao_lances, tempo_atualizacao){
  if(contador_itens_atualizados >= contador_itens_final || index_atual_aba != index_aba){
    contador_itens_atualizados = 0;
    contador_itens_final = 0;
    index_atual_aba = index_aba;

    $(".tabDataBlock table:eq(" + index_aba + ") input.idItem").each(function(){
      contador_itens_final += 1;
  	
      let id_item = $(this).val();
      let celula_pai = $(this).parent();
    	
      if($(this).parent().find(".toolTipListBlock").length == 0 || $(this).parent().find(".toolTipListBlock:hidden").length > 0){
        $.ajax({
          url: url_atualizacao_lances,
          type: 'post',
          dataType: 'text',
          cache: false,
          data: "ttCD_ITEM_LICITACAO=" + id_item,
          success: function(data, textStatus){
            if(data != "")
              celula_pai.html(data);
            contador_itens_atualizados += 1;
          },
          error: function(){	
            contador_itens_atualizados += 1;
          }
        });
      }
    });
  }
	
  id_timeout_lances = setTimeout(function(){ atualizarLances(index_aba, url_atualizacao_lances, tempo_atualizacao) }, tempo_atualizacao);
}*/

function reabrirModais(obj_ref) {
  $(obj_ref).find(".formModalLink").prettyPhoto({
    theme:
      "pp_default" /* pp_default / light_rounded / dark_rounded / light_square / dark_square / facebook */,
    allow_resize: false,
    default_width: 732,
    default_height: 415,
  });
  $(obj_ref).find(".formModalLink2").prettyPhoto({
    theme:
      "pp_default" /* pp_default / light_rounded / dark_rounded / light_square / dark_square / facebook */,
    allow_resize: false,
    default_width: 752,
    default_height: 415,
  });
  $(obj_ref).find(".formModalLink3").prettyPhoto({
    theme:
      "pp_default" /* pp_default / light_rounded / dark_rounded / light_square / dark_square / facebook */,
    allow_resize: false,
    default_width: 752,
    default_height: 600,
  });
  $(obj_ref).find(".formModalLink4").prettyPhoto({
    theme:
      "pp_default" /* pp_default / light_rounded / dark_rounded / light_square / dark_square / facebook */,
    allow_resize: false,
    default_width: 1162,
    default_height: 465,
  });
  $(obj_ref).find(".formModalLink5").prettyPhoto({
    theme:
      "pp_default" /* pp_default / light_rounded / dark_rounded / light_square / dark_square / facebook */,
    allow_resize: false,
    default_width: 752,
    default_height: 600,
  });
  $(obj_ref).find(".moreTextLink").prettyPhoto({
    theme:
      "pp_default" /* pp_default / light_rounded / dark_rounded / light_square / dark_square / facebook */,
    allow_resize: false,
    default_width: 752,
    default_height: 415,
  });
}

function obterPosicaoScroll(obj_scroll, dif) {
  return obj_scroll.get(0).scrollHeight - obj_scroll.scrollTop() - dif;
}

function atualizarHoraUltimaAtualizacaoTelaLances() {
  if (contador_falhas_janela_lances === 0)
    $("#ultimaAtualizacao").text($("input[name=horaAtual]").val());
}

function atualizarHoraUltimaAtualizacaoChat() {
  if (contador_falhas_pregao === 0) {
    let horaAtualChat = "";

    try {
      horaAtualChat = $("span.timerCounter").text().trim();
      let regExpHora = new RegExp(/^([0-1]?\d|2[0-3]):[0-5]\d:[0-5]\d$/i);

      if (!regExpHora.test(horaAtualChat))
        horaAtualChat = $("input[name=horaAtual]").val();
    } catch (e) {
      console.error(e)
      horaAtualChat = $("input[name=horaAtual]").val();
    }

    $("#ultimaAtualizacaoChat").text(horaAtualChat);
  }
}

$(document).ready(function () {
  $(".itemSubmit").live("click", function (e) {
    e.preventDefault();
    let link_ajax = $(this).attr("href");
    let linha_link = $(this).parent();

    //Procurar a linha pai
    while (linha_link.get(0).tagName.toLowerCase() != "tr") {
      linha_link = linha_link.parent();
    }

    let seletor_linha = linha_link.attr("id");

    $.ajax({
      url: link_ajax,
      type: "get",
      dataType: "text",
      cache: false,
      success: function (text) {
        //Substituir a linha
        if (text != "") {
          linha_link.hide();
          linha_link.replaceWith(text);
          if (seletor_linha != "") {
            reabrirModais($("#" + seletor_linha));
            aplicarMascaras("#" + seletor_linha);
          } else reabrirModais(linha_link);
          linha_link.show();
        }
      },
      error: function () {
        //reabrirModais();
      },
    });
  });
  $(".loteSubmit").live("click", function (e) {
    e.preventDefault();
    let link_ajax = $(this).attr("href");

    $.ajax({
      url: link_ajax,
      type: "get",
      dataType: "text",
      cache: false,
      success: function (text) {
        //Recarregar todo o bloco
        verificarIdGeralLicitacao();

        let index_aba = $(".tabDataList .tabDataMarked a").data("param");
        let url_aba = $(".tabDataList .tabDataMarked a").attr("href");

        obterConteudoAba(
          url_aba,
          index_aba,
          url_atualizacao_lances_atual,
          tempo_atualizacao_lances_atual,
          id_licitacao_atual,
        );
        id_timeout_aba = setInterval(
          verificarAtualizacaoAba,
          tempo_atualizacao_aba_atual,
          url_atualizacao_lances_atual,
          tempo_atualizacao_lances_atual,
          id_licitacao_atual,
        );
      },
      error: function () {
        //reabrirModais();
      },
    });
  });
});

# Manuale di installazione e configurazione

I requisiti minimi per eseguire il software sono i seguenti:

- Sistema operativo (Linux o Windows)
- Apache Web server (2.4.6) (o IIS 7 o 8) installato e attivo
- PHP 7.1 installato e configurato inclusa estensione per mysql, mbstring e ldap
- Joomla 3.8 con estensione Shmanic LDAP.
- la copia della 

## Installazione

L&#39;installazione del geoviewer consiste in:

- copia della cartella [geoviewer](../geoviewer) nella propria installazione <webserver>/geoportale. Il geoviewer può essere installato anche in altre posizioni, ma poi bisogna fare attenzione che i riferimenti dal menu Joomla e dalle webapp (gpt.xml) siano corretti;
  
- copia della cartella proxy4 (Windows) o proxyPHP in <webserver>/geoportale (ad.es. /var/www/html/geoportale/proxyPHP oppure C:\inetpub\www\geoportale\proxy4). In Windows, è anche necessario convertire proxy4 in applicazione Aspx. Il proxy è necessario per superare le eccezioni di sicurezza per il caricamento di WMS da altri siti (CORS).
  
## Configurazione

Il Geoviewer viene configurato attraverso dei file json, a livello globale e a livello di ogni componente (widget).

Normalmente i widget non hanno bisogno di configurazione, tranne il widget di ricerca sul catalogo.

I parametri globali sono da configurare nel file geoportale/geoviewer/config.json verificando i seguenti valori:

```json
…
"title": "RNDT",
"subtitle": "Repertorio Nazionale dei Dati Territoriali",
"logo": "images/app-logo.png",
…
"httpProxy": {
"useProxy": true,
"url": "../proxy4/proxy.ashx" oppure "../proxyPHP/proxy.php"
```

I parametri del widget di ricerca nel catalogo sono da configurare nel file geoportale/geoviewer/widgets/GeoportalSearch/config.json verificando i seguenti valori:

```json
"catalogs": [
{
"name": "Catalogo RNDT",
"url": "http://geodati.gov.it/geoportalRNDTPA/rest/find/document"
}
```

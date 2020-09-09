# Manuale di installazione e configurazione

## Installazione

L&#39;installazione del geoviewer consiste in:

- copia della cartella [geoviewer](../geoviewer) nella propria installazione <webserver>/geoportale. Il geoviewer può essere installato anche in altre posizioni, ma poi bisogna fare attenzione che i riferimenti dal menu Joomla e dalle webapp (gpt.xml) siano corretti
- copia della cartella proxy4 (Windows) o proxyPHP in <webserver>/geoportale (ad.es. /var/www/html/geoportale/proxyPHP oppure C:\inetpub\www\geoportale\proxy4). In Windows, è anche necessario convertire proxy4 in applicazione Aspx. Il proxy è necessario per superare le eccezioni di sicurezza per il caricamento di WMS da altri siti (CORS).

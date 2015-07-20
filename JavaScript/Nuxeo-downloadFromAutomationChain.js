/*	2015-07-17

	This utility allows to download a binary returned by an Automation Chain in Nuxeo.
	First use case was a chain that queries for document, group them and zip them.
	Note: If you are Nuxeo developer and are using JSF for your UI, you don't need this,
	just add the operation User Interface > Download File at the end of your chain.

	WARNING * * * * * WARNING * * * * * WARNING * * * * * WARNING * * * * * WARNING
	-> The code assumes the client is already connected to nuxeo
	-> The code assumes it is a nuxeo server which served the page (no CORS)
	-> The code assumes the context path is "/nuxeo"
			(The URL is hard coded: /nuxeo/api/v1/automation/chainId)
	-> Error handling is very poor. We recommend you just get this code and adapt it.
 
	The problem here is that Automation can only be called in a POST request, so using
	the <a href="/nuxeo/site/automation/myChain"></a> element will not work.

	The solution here will work in what can be called "modern browsers", and here are
	some explanations:
		-> We can't use jQuery.ajax(), because we need to handle the 'blob' responseType
		   and it looks like jQuery is not ready for this => we must use the XMLHttpRequest
		   object.
		-> We can't use nuxeo.js (the JavaScript client of Nuxeo) for the same reason: It uses
		   jQuery, at least in current version(2015-07-17)

	Thanks to Jonathan Amend on StackOverflow:
		http://stackoverflow.com/questions/16086162/handle-file-download-from-ajax-post

*/

/*	downloadFromChain()

	input: String, ID or path of a document in the repository.
		   For chains which don't expect an input (start with a Query for example), use "" or null.

	chainParams and chainContext must be of type object, not string.

	Examples of call:
		Chain which expects no input, no parameters, no context:
			downloadFromChain("myChainId");
		Chain with an input and some parameters
			downloadFromChain("myChainId", "/default-domain/", {param1: 123, param2: "hi there"});
*/
function downloadFromChain(chainId, input, chainParams, chainContext) {

	var url, xhrBody, xhr;

	url = "/nuxeo/api/v1/automation/" + chainId;

	// To be passed to the XMLHttpRequest, expected by Nuxeo
	// If there is no input (id or path of an existing document), it must be defined at all
	xhrBody = {
		params: {},
		context: {}
	};
	if(typeof input === "string" && input !== "") {
		xhrBody.input = input;
	}
	if(typeof chainParams === "object" && input !== null) {
		xhrBody.params = chainParams;
	}

	if(typeof chainContext === "object" && input !== null) {
		xhrBody.context = chainContext;
	}

	xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		var filename, filenameRegex, matches,
			disposition, type, blob,
			URL, downloadUrl,
			a,
			str;

		if (this.readyState !== 4) {
			return;
		}
	    if (this.status == 200){

            filename = "";
	        disposition = xhr.getResponseHeader('Content-Disposition');
	        if (disposition && disposition.indexOf('attachment') !== -1) {
	            filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
	            matches = filenameRegex.exec(disposition);
	            if (matches != null && matches[1]) {
	            	filename = matches[1].replace(/['"]/g, '');
	            }
	        }

	        type = xhr.getResponseHeader('Content-Type');
        	blob = new Blob([this.response], { type: type });

        	if (typeof window.navigator.msSaveBlob !== 'undefined') {
            	// IE workaround for "HTML7007: One or more blob URLs were revoked
            	// by closing the blob for which they were created. These URLs will
            	// no longer resolve as the data backing the URL has been freed."
            	window.navigator.msSaveBlob(blob, filename);
        	} else {
		        URL = window.URL || window.webkitURL;
	            downloadUrl = URL.createObjectURL(blob);
	            if (filename) {
	                // use HTML5 a[download] attribute to specify filename
	                a = document.createElement("a");
	                // safari doesn't support this yet
	                if (typeof a.download === 'undefined') {
	                    window.location = downloadUrl;
	                } else {
	                    a.href = downloadUrl;
	                    a.download = filename;
	                    document.body.appendChild(a);
	                    a.click();
	                }
	            } else {
	                window.location = downloadUrl;
	            }
	        }
	    } else {
	    	// Display the error in a nicer way than an alert :-)
			str = "An error occured";
			str += "\n" + this.statusText;
			alert(str)
	    }
	}

	xhr.open('POST', url);
	xhr.setRequestHeader("Content-type", "application/json");
	xhr.setRequestHeader("Accept", "*/*");
	xhr.responseType = 'blob';
	xhr.send( JSON.stringify(xhrBody));

}

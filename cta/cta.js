let Personnels = []
let Vhcs = []
let Radios = []
let Intervention = {}

function getXMLHttpRequest() {
	let xhr = null;
	if (window.XMLHttpRequest || window.ActiveXObject) {
		if (window.ActiveXObject) {
			try {
				xhr = new ActiveXObject("Msxml2.XMLHTTP");
			} catch(e) {
				xhr = new ActiveXObject("Microsoft.XMLHTTP");
			}
		} else {
			xhr = new XMLHttpRequest(); 
		}
	} else {
		alert("Votre navigateur ne supporte pas l'objet XMLHTTPRequest...");
		return null;
	}
	
	return xhr;
}
function PostAJAX(link, data, callback){
    let xhr = getXMLHttpRequest()
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            callback(xhr.status, JSON.parse(xhr.responseText))
        }
    }
    xhr.open("POST", link, true)
    xhr.setRequestHeader("Content-Type", "application/json")
    xhr.send(JSON.stringify(data))
}

function render(){
    // Radio
    let chat_html = ""
    Radios.reverse()
    Radios.forEach(element => { chat_html = chat_html + '<p>' + element + '</p>' })
    document.getElementById("RADIO").innerHTML = chat_html

    // Personnels
    let user_html = ""
    Personnels.forEach(user => {
        let isnotassigned = ""
        if(user.vhc_inter == ""){ isnotassigned = " w3-light-blue w3-opacity" }
        user_html = user_html + '<li class="w3-bar"><div class="w3-bar-item"><span class="w3-large">' + user.pseudo + '</span><br><span>' + user.grade + '</span></div><div class="w3-bar-item w3-tooltip' + isnotassigned + '" onclick="saveVhc(\'NO\', ' + user.ID + ')"><img src="https://cta.loulou123546.fr/img/x.png" alt="retirer" style="height: 49px;"><span class="w3-text">retirer</span></div>'
        Vhcs.forEach(user_car => {
            if(user.vhc_inter == user_car.name){
                user_html = user_html + '<div class="w3-bar-item w3-tooltip w3-light-blue w3-opacity" onclick="saveVhc(\'' + user_car.name + '\', ' + user.ID + ')"><img src="https://cta.loulou123546.fr/img/' + user_car.icon + '.png" alt="' + user_car.name + '" style="height: 49px;"><span class="w3-text">' + user_car.name + '</span></div>'
            } else {
                user_html = user_html + '<div class="w3-bar-item w3-tooltip" onclick="saveVhc(\'' + user_car.name + '\', ' + user.ID + ')"><img src="https://cta.loulou123546.fr/img/' + user_car.icon + '.png" alt="' + user_car.name + '" style="height: 49px;"><span class="w3-text">' + user_car.name + '</span></div>'
            }
        })
        user_html = user_html + '</li>'
    })
    if(user_html == ""){
        document.getElementById("UNITS").innerHTML = '<li class="w3-bar"><div class="w3-bar-item">Pas de personnel</div></li>'
    } else {
        document.getElementById("UNITS").innerHTML = user_html
    }
    document.getElementById("INTER_TITLE").innerHTML = Intervention.name
}

function fetchAuto(){
    PostAJAX("/API/fetch", {}, (code, result) => {
        if(code == 200){
            Personnels = result.players
            Vhcs = result.vhcs
            Intervention = result.inter
            Radios = result.chat
            render()
        }
    })
    setTimeout(fetchAuto, 2000)
}

setTimeout(fetchAuto, 10)


function saveInter(titre, loc, details){
    PostAJAX("/API/updateINTER", {
        titre: titre,
        details: details,
        localisation: loc
    }, function(code, result){
        if(code != 200){
            alert("Probleme lors de la sauvegarde")
        }
    })
    return 0
}

function saveVhc(vhc, ID){
    PostAJAX("/API/updateVHC", {
        vhc: vhc,
        ID: ID
    }, function(code, result){
        if(code != 200){
            alert("Probleme lors de la sauvegarde")
        }
    })
    return 0
}

function post_msg(){
    if(String(document.getElementById("new_message").value).startsWith("/bip")){
        saveInter(String(document.getElementById("new_message").value).replace("/bip ", ""), "No data", "No data")
        document.getElementById('new_message').value = ""
    } else {
        PostAJAX("/API/newMSG", {
            user: "CTA",
            msg: document.getElementById("new_message").value,
        }, function(code, result){
            if(code != 200){
                alert("Probleme lors de la sauvegarde")
            } else {
                document.getElementById('new_message').value = ""
            }
        })
    }
}

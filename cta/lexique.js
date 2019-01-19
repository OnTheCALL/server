let mysql = require("mysql")

let color = 0x26A69A

function safeInputSQL (entry){
    let safeout = ""
    for (var i = 0; i < entry.length; i++) {
        if(/[A-Za-z0-9\ \_\.\:\!\?\(\)\=\+\-\*\/]/i.test(entry.charAt(i))){
            safeout += entry.charAt(i)
        } else if(entry.charAt(i) == "'"){
            safeout += "\\'"
        } else if(entry.charAt(i) == '"'){
            safeout += '\\"'
        } else if(entry.charAt(i) == '\\'){
            safeout += '\\\\'
        }
    }
    return safeout
}

function fromABBR(searching){
    let res = []
    const Lexique = {
        "FPT": "Fourgon Pompe Tonne",
        "VSAV": "Véhicule de Secours et D'assistance aux Victimes",
        "VL": "Véhicule Léger / de Liaison",
        "VTU": "Véhicule Toute Utilité",
        "CTA": "Centre de Traitement de l'Alerte"
    }
    for (const key in Lexique) {
        if (Lexique.hasOwnProperty(key)) {
            const element = Lexique[key];
            if(searching.toUpperCase().includes(key)){
                res.push({name: key, value: element})
            }
        }
    }
    return res
}

function fromPlayers(searching, MSQL, cb){
    let con = mysql.createConnection(MSQL)
    con.connect(function(err2) {
        if(err2){
            try{
                con.end()
            }
            catch (e) {
            }
        } else {
            con.query("SELECT grade,pseudo FROM players WHERE pseudo = '" + safeInputSQL(searching) + "';", function (err3, res, fields) {
                if(!err3){
                    let ress = []
                    for (const key in res) {
                        if (res.hasOwnProperty(key)) {
                            const element = res[key];
                            ress.push({name:"Joueur `" + element.pseudo + "`", value: "grade : **" + element.grade + "**"})
                        }
                    }
                    cb(ress)
                }
                con.end()
            })
        }
    })
}

function newMSG (msg, MSQL) {
    let cherche = msg.content.split(" ").slice(2).join(" ")
    if(cherche == "help"){
        msg.channel.send("", {
            embed:{
                title: "**On The CALL** : Aide à la recherche",
                description: "commande : `&otc search ...` | ci-dessous les méthodes de recherche",
                color: color,
                fields:[
                    {name: "Abbréviation", value: "FPT, VSAV, CTA, ..."},
                    {name: "Joueurs", value: "loulou123546, jery, ..."}
                ],
                footer: {
                    text:"On The CALL, premier simulateur de pompier gratuit"
                }
            }
        })
    } else {
        fromPlayers(cherche, MSQL, (res1) => {
            let res2 = fromABBR(cherche)
            let res_final = res2.concat(res1)
            res_final = res_final.slice(0,5)

            if(res_final == []){
                res_final = [{name:"Aucun résultat", value:"proposer vos ajouts en MP"}]
            }

            msg.channel.send("", {
                embed:{
                    title: "**On The CALL** : 5 premiers résultats",
                    description: "Terme de la recherche : `" + cherche + "`",
                    color: color,
                    fields:res_final,
                    footer: {
                        text:"On The CALL, premier simulateur de pompier gratuit"
                    }
                }
            })
        })
    }
}

module.exports = {
    newMSG: newMSG
}

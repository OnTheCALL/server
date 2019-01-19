let fs = require('fs')
let mysql = require("mysql")
let qs = require('querystring')
const dgram = require("dgram")
let Discord = require("discord.js")
let bot_lexique = require("./lexique.js")
let manageInter = require("./interventions.js")

var passwords = require("./password.js")
var MSQL = passwords.MSQL
/*
var MSQL = {
    host: "localhost",
    user: "xxx",
    password: "xxx",
    database: "xxx"
}*/

function addLog (entry){
    let now = new Date()
    let text = "[" + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds() + "] (cta) " + entry + "\n"
    let filename = "logs/" + now.getDate() + "-" + (now.getMonth() + 1) + "-" + now.getFullYear() + ".txt"
    fs.writeFile(filename, text, {encoding: 'utf8', flag: 'a'}, (err) => {
        if (err) {
            console.log(err)
        }
    })
}

Array.prototype.clone = function(){ return Array.apply(null,this) }
Array.prototype.sortIt    = Array.prototype.sort;
Array.prototype.reverseIt = Array.prototype.reverse;
Array.prototype.sort = function(){ var tmp = this.clone(); return tmp.sortIt.apply(tmp,arguments) }
Array.prototype.reverse = function(){ var tmp = this.clone(); return tmp.reverseIt.apply(tmp,arguments) }

var kick_waves = 0
var annouced = { m30: false, m15: false, m5: false, m1: false }

var DATAS = {
    inter_data : {
        name: "", // <=> display name
        inter_name : "", // <=> tag
        chat_inter : [],
        datas : {
            victimes : [],
            incendies : [],
            others : []
        },
        shared_data : {
            victimes : [],
            incendies : [],
            others : []
        }
    },
    cones : [],
    players : [],
    vehicle: {
        "VSAV 01": {code: 1, gyro2: 0, x: 47.7, y: -6.63, z: 180.0, driver: 0, p1: 0, p2: 0},
        "FPT 01": {code: 1, gyro2: 0, x: 51.35, y: -5.93, z: 180.0, driver: 0, p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, p7: 0},
        "FPTSR 01": {code: 1, gyro2: 0, x: 55.75, y: -5.93, z: 180.0, driver: 0, p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, p7: 0},
        "VL 01": {code: 1, gyro2: 0, x: 73.72, y: -17.26, z: 90.0, driver: 0, p1: 0, p2: 0},
        "SAMU_VL 01": {code: 1, gyro2: 0, x: 238.3, y: 74.9, z: 90.0, driver: 0, p1: 0, p2: 0}
    },
    Ids: ["0 invalid"],
    setmypos: function (data, so) {
        if(data.args_size == 5 && this.players[Number(data.args[0])] != undefined && this.players[Number(data.args[0])].active == true){
            this.players[Number(data.args[0])].x = Number(data.args[1])
            this.players[Number(data.args[0])].y = Number(data.args[2])
            this.players[Number(data.args[0])].incar = Number(data.args[3])

            this.players[Number(data.args[0])].lastwave = kick_waves
            if(Number(data.args[3]) == 1){
                for (const key in this.vehicle) {
                    if (this.vehicle.hasOwnProperty(key)) {
                        const element = this.vehicle[key];
                        if(element.driver == Number(data.args[0])){
                            this.vehicle[key].x = Number(data.args[1])
                            this.vehicle[key].y = Number(data.args[2])
                            this.vehicle[key].z = Number(data.args[4])
                        }
                    }
                }
            }

            for (const key in this.inter_data.shared_data.victimes) {
                if (this.inter_data.shared_data.victimes.hasOwnProperty(key)) {
                    const element = this.inter_data.shared_data.victimes[key]
                    if(element.IDfollow == Number(data.args[0])){
                        this.inter_data.shared_data.victimes[key].pos.x = Number(data.args[1])
                        this.inter_data.shared_data.victimes[key].pos.y = Number(data.args[2])
                        this.inter_data.shared_data.victimes[key].pos.z = -8
                        this.inter_data.shared_data.victimes[key].pos.rot = 0
                    } else if(this.vehicle[ element.IDfollow ] != undefined && this.vehicle[ element.IDfollow ].driver == Number(data.args[0])){
                        this.inter_data.shared_data.victimes[key].pos.x = Number(data.args[1])
                        this.inter_data.shared_data.victimes[key].pos.y = Number(data.args[2])
                        this.inter_data.shared_data.victimes[key].pos.z = 10 //under map
                        this.inter_data.shared_data.victimes[key].pos.rot = Number(data.args[4])
                    }
                }
            }
            
            /*this.players.forEach(element => {
                if(element.ID != Number(data.args[0])){
                    so.send(Buffer.from(prepare()), 26001, element.IP, err => {
                        if (err) console.error(err)
                    })
                } else {
                    //to change, simulate fake player
                    //so.send(Buffer.from("fetchedpos#" + 0 + "#" + (Number(data.args[1]) + 1) + "#" + (Number(data.args[2]) + 1) + "#" + Number(data.args[3])), 26001, element.IP, err => {
                    //    if (err) console.error(err)
                    //})
                    so.send(Buffer.from("10-4"), 26001, element.IP, err => {
                        if (err) console.error(err)
                    })
                }
            })*/
            return prepare(Number(data.args[0]))
        } else {
            //console.log(data)
            //addLog("UDP => appel de setmypos de maniere incorrect : " + JSON.stringify(data))

            // It's just a player who doesn't disconnect between reboot

            return "error"
        }
    },
    getposof: function (data) {
        if(data.args_size == 1 && this.players[Number(data.args[0])] != undefined){
            return "fetchedpos#" + Number(data.args[0]) + "#" + this.players[Number(data.args[0])].x + "#" + this.players[Number(data.args[0])].y + "#" + this.players[Number(data.args[0])].incar
        }
    }
}

//Initilisation
for (let i = 0; i < 100; i++) {
    DATAS.cones[i] = ""
}

function prepare(player_ID) {
    let text = ""
    let nb = 0
    for (const key in DATAS.players) {
        if (DATAS.players.hasOwnProperty(key)) {
            const element = DATAS.players[key];
            if(element.active == true){
                text += "&fetchedpos#" + key + "#" + element.x + "#" + element.y + "#" + element.incar + ""
                nb = nb + 1
            }
        }
    }

    let inter_datas = "&INTER#"
    if(DATAS.players[player_ID].vhc_inter != ""){
        inter_datas = inter_datas + DATAS.inter_data.inter_name + "#" + DATAS.inter_data.name + "#" + DATAS.players[player_ID].vhc_inter
    } else {
        inter_datas = inter_datas + DATAS.inter_data.inter_name + "#" + DATAS.inter_data.name + "#NO"
    }

    let victimes_text = ""
    for (const i in DATAS.inter_data.shared_data.victimes) {
        if (DATAS.inter_data.shared_data.victimes.hasOwnProperty(i)) {
            const el = DATAS.inter_data.shared_data.victimes[i];
            victimes_text += "&VICTIME#" + DATAS.inter_data.inter_name + "#" + i + "#" + el.pos.x + "#" + el.pos.y + "#" + el.pos.z + "#" + el.pos.rot
        }
    }

    let VSAV1 = "&VSAV 01#" + DATAS.vehicle["VSAV 01"].code + "#" + DATAS.vehicle["VSAV 01"].gyro2 + "#" + DATAS.vehicle["VSAV 01"].x + "#" + DATAS.vehicle["VSAV 01"].y + "#" + DATAS.vehicle["VSAV 01"].z + "#" + DATAS.vehicle["VSAV 01"].driver
    let FPT1 = "&FPT 01#" + DATAS.vehicle["FPT 01"].code + "#" + DATAS.vehicle["FPT 01"].gyro2 + "#" + DATAS.vehicle["FPT 01"].x + "#" + DATAS.vehicle["FPT 01"].y + "#" + DATAS.vehicle["FPT 01"].z + "#" + DATAS.vehicle["FPT 01"].driver
    let FPTSR1 = "&FPTSR 01#" + DATAS.vehicle["FPTSR 01"].code + "#" + DATAS.vehicle["FPTSR 01"].gyro2 + "#" + DATAS.vehicle["FPTSR 01"].x + "#" + DATAS.vehicle["FPTSR 01"].y + "#" + DATAS.vehicle["FPTSR 01"].z + "#" + DATAS.vehicle["FPTSR 01"].driver
    let VL1 = "&VL 01#" + DATAS.vehicle["VL 01"].code + "#" + DATAS.vehicle["VL 01"].gyro2 + "#" + DATAS.vehicle["VL 01"].x + "#" + DATAS.vehicle["VL 01"].y + "#" + DATAS.vehicle["VL 01"].z + "#" + DATAS.vehicle["VL 01"].driver
    let SAMU_VL1 = "&SAMU_VL 01#" + DATAS.vehicle["SAMU_VL 01"].code + "#" + DATAS.vehicle["SAMU_VL 01"].gyro2 + "#" + DATAS.vehicle["SAMU_VL 01"].x + "#" + DATAS.vehicle["SAMU_VL 01"].y + "#" + DATAS.vehicle["SAMU_VL 01"].z + "#" + DATAS.vehicle["SAMU_VL 01"].driver
    return "all#2#" + nb + inter_datas + VSAV1 + FPT1 + FPTSR1 + VL1 + SAMU_VL1 + text + victimes_text
}

function renewKick() {
    kick_waves++
    for (const key in DATAS.players) {
        if (DATAS.players.hasOwnProperty(key)) {
            const element = DATAS.players[key];
            if((element.active == true) && (element.lastwave + 1 < kick_waves)){
                console.log("\nKICKED PLAYER : " + key + "\n")
                console.log(DATAS.players[key])
                addLog("Joueur KICK : " + element.pseudo + "  |  raison : timeout server ( renewKick )")
                addLog("data du joueur : " + JSON.stringify(DATAS.players[key]))
                CTA_message.push("<i>" + element.pseudo + " has left (timeout server)</i>")
                DISC_log.send("", {
                    embed:{
                        title: "**On The CALL** : deconnection de " + element.pseudo + " (timeout server)",
                        color: 0x9C27B0
                    }
                })

                //clear vhc driver
                for (const key in DATAS.vehicle) {
                    if (DATAS.vehicle.hasOwnProperty(key)) {
                        if(DATAS.vehicle[key].driver == Number(key)){
                            DATAS.vehicle[key].driver = 0
                        }
                    }
                }
                //clear brancard IDfollow
                for (const key in DATAS.inter_data.shared_data.victimes) {
                    if (DATAS.inter_data.shared_data.victimes.hasOwnProperty(key)) {
                        const element = DATAS.inter_data.shared_data.victimes[key]
                        if(element.IDfollow == Number(key)){
                            DATAS.inter_data.shared_data.victimes[key].IDfollow = -1
                        }
                    }
                }

                DATAS.players[key].active = false
                DATAS.players[element.ID].vhc_inter = false
            }
        }
    }

    // Check time and say if there are a reboot
    let now = new Date()
    let end = new Date( (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear() + ' 23:59:00')
    var timeDiff = end.getTime() - now.getTime()
    if(timeDiff > 0 && timeDiff < 60000*30){
        if(annouced.m30 == false){
            CTA_message.push("<b>REBOOT DANS 30 MINUTES</b>")
            addLog("reboot dans 30 minutes")
            annouced.m30 = true
        }
        if(timeDiff > 0 && timeDiff < 60000*15){
            if(annouced.m15 == false){
                CTA_message.push("<b>REBOOT DANS 15 MINUTES</b>")
                addLog("reboot dans 15 minutes")
                annouced.m15 = true
            }
            if(timeDiff > 0 && timeDiff < 60000*5){
                if(annouced.m5 == false){
                    CTA_message.push("<b>REBOOT DANS 5 MINUTES</b>")
                    addLog("reboot dans 5 minutes")
                    annouced.m5 = true
                }
                if(timeDiff > 0 && timeDiff < 60000){
                    if(annouced.m1 == false){
                        CTA_message.push("<b>REBOOT DANS 1 MINUTE</b>")
                        addLog("reboot dans 1 minute")
                        annouced.m1 = true
                    }
                    
                }
            }
        }
    }
    setTimeout(renewKick, 5000)
}


function doSQL(query, cbValid, Auto500 = false){
    let con = mysql.createConnection(MSQL)
    con.connect(function(err2) {
        if(err2){
            addLog("ERREUR MYSQL : " + err2)
            if(Auto500 != false){
                Auto500.writeHead(500, {"Content-Type": "application/json; charset=utf-8"})
                Auto500.end('{"error" : true}')
            } else {
                cbValid(err2)
            }
        } else {
            con.query(query, function (err3, res, fields) {
                if(err3){
                    addLog("ERREUR MYSQL : " + err3)
                    if(Auto500 != false){
                        Auto500.writeHead(500, {"Content-Type": "application/json; charset=utf-8"})
                        Auto500.end('{"error" : true}')
                    } else {
                        cbValid(err3)
                    }
                } else {
                    cbValid(res)
                }
                con.end()
            })
        }
    })
}

function sortwithTYPE(income){
    let output = []
    let order = ["VLM", "VSAV", "PMA", "VPI", "FPTL", "FPT", "FPTSR", "VSR", "VBS", "VL", "VLCG", "VLHR", "VLC", "PCM", "VTU", "EPA", "BEA", "CCF", "CCGC", "FMOGP", "DATT", "GRIMP", "VSD", "VPL", "VIRT", "CYNO", "VSA", "TITAN", "*"]
    order.forEach(thistype => {
        for (let i = 0; i < income.length; i++) {
            const now = income[i]
            if(now != 0 && (now.type == thistype || thistype == "*")){
                output.push(now)
                income[i] = 0
            }
        }
    })
    return output
}

var CTA_message = ["<b>System</b> : Bienvenue sur le jeu, ici arrive tout les messages venant du CTA"]

function page_home(response, utils){
    fs.readFile("cta/cta_main.html", 'utf8', (err1, data) => {
        if(err1){
            utils.error404(response, "Le fichier est introuvable")
        } else {
            response.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8"
            })
            response.end(data)
        }
    })
}

function page_css(response, utils){
    fs.readFile("cta/cta.css", 'utf8', (err, data) => {
        if(err){
            utils.error500(response)
        } else {
            response.writeHead(200, {
                "Content-Type": "text/css; charset=utf-8"
            })
            response.end(data)
        }
    })
}
function page_js(response, utils){
    fs.readFile("cta/cta.js", 'utf8', (err, data) => {
        if(err){
            utils.error500(response)
        } else {
            response.writeHead(200, {
                "Content-Type": "application/javascript; charset=utf-8"
            })
            response.end(data)
        }
    })
}
function page_API_fetch(response){
    response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8"
    })
    let personelss = []
    DATAS.players.forEach(element => {
        if(element.active == true){
            personelss.push(element)
        }
    })
    response.end(JSON.stringify({
        players: personelss,
        inter: DATAS.inter_data,
        vhcs: [{name: "VSAV 01", icon: "VSAV"}, {name: "FPT 01", icon: "FPT"}, {name: "FPTSR 01", icon: "VSR"}, {name: "VL 01", icon: "VL"}, {name: "SAMU", icon: "SAMU"}],
        chat: CTA_message
    }))
}

function page_API_updateVHC(response, post, utils){
    let data = JSON.parse(post)
    if((data.vhc != undefined && data.ID != undefined) && (DATAS.players[Number(data.ID)] != undefined  && DATAS.players[Number(data.ID)].active == true)){
            DATAS.players[Number(data.ID)].vhc_inter = utils.safeInputSQL(data.vhc)
            if(utils.safeInputSQL(data.vhc) == "NO"){
                DATAS.players[Number(data.ID)].vhc_inter = ""
            }
            response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"})
            response.end(JSON.stringify({ok: true}))
    } else {
        response.writeHead(400, {"Content-Type": "application/json; charset=utf-8"})
        response.end(JSON.stringify({error: true}))
    }
}
function page_API_updateINTER(response, post, utils){
    let data = JSON.parse(post)
    if(data.titre != undefined && data.localisation != undefined && data.details != undefined){
        DATAS.inter_data.name = utils.safeInput(data.titre)
        response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"})
        response.end(JSON.stringify({ok: true}))
    } else {
        response.writeHead(400, {"Content-Type": "application/json; charset=utf-8"})
        response.end(JSON.stringify({error: true}))
    }
}
function page_API_newMSG(response, post, utils){
    let data = JSON.parse(post)
    if(data.msg != undefined && data.user != undefined){
        if(data.user === "CTA" && utils.safeInput(data.msg).startsWith("/")){
            if(utils.safeInput(data.msg) == "/stopinter"){
                DATAS.inter_data = {
                    name: "",
                    inter_name : "",
                    chat_inter : [],
                    datas : {
                        victimes : [],
                        incendies : [],
                        others : []
                    },
                    shared_data: {
                        victimes : [],
                        incendies : [],
                        others : []
                    }
                }
            } else if(utils.safeInput(data.msg) == "/startinter"){
                DATAS.inter_data = manageInter.generateInter()
            } else if(utils.safeInput(data.msg) == "/newinter"){
                DATAS.inter_data = {
                    name: "",
                    inter_name : "",
                    chat_inter : [],
                    datas : {
                        victimes : [],
                        incendies : [],
                        others : []
                    },
                    shared_data: {
                        victimes : [],
                        incendies : [],
                        others : []
                    }
                }
                setTimeout(() => {
                    DATAS.inter_data = manageInter.generateInter()
                }, 10000)
            }
        } else {
            CTA_message.push("<b>" + utils.safeInput(data.user) + "</b> : " + utils.safeInput(data.msg))
        }
        response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"})
        response.end(JSON.stringify({ok: true}))
        DISC_log.send("", {
            embed:{
                title: "Message " + utils.safeInput(data.user) + " : " + utils.safeInput(data.msg),
                color: 0x2196F3
            }
        })
    } else {
        response.writeHead(400, {"Content-Type": "application/json; charset=utf-8"})
        response.end(JSON.stringify({error: true}))
    }
}
function page_gameAPI_newMSG(response, post, utils){
    let data = qs.parse(post)
    if(data.msg != undefined && data.user != undefined){
        CTA_message.push("<b>" + utils.safeInput(data.user) + "</b> : " + utils.safeInput(data.msg))
        response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"})
        response.end(JSON.stringify({ok: true}))
        DISC_log.send("", {
            embed:{
                title: "Message " + utils.safeInput(data.user) + " : " + utils.safeInput(data.msg),
                color: 0x2196F3
            }
        })
    } else {
        response.writeHead(400, {"Content-Type": "application/json; charset=utf-8"})
        response.end(JSON.stringify({error: true}))
    }
}

function page_API_customMSG(response, post, utils){
    let data = JSON.parse(post)
    if(data.msg != undefined && data.msg == utils.safeInput(data.msg)){
        CTA_message.push(utils.safeInput(data.msg))
        response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"})
        response.end(JSON.stringify({ok: true}))
    } else {
        response.writeHead(400, {"Content-Type": "application/json; charset=utf-8"})
        response.end(JSON.stringify({error: true}))
    }
}

function page_gameAPI_fetch(response, post){
    let data = qs.parse(post)
    if(data.ID != undefined){
        let player = DATAS.players[ Number(data.ID) ]
        if(player != undefined){
            response.writeHead(200, {
                "Content-Type": "application/json; charset=utf-8"
            })
            response.end(JSON.stringify({
                error: 0,
                chat: CTA_message.join("\n"),
                chat_inter: DATAS.inter_data.chat_inter.reverse().join("\n"),
                cones: DATAS.cones.join("&"),
                inter_info : manageInter.getDataString(DATAS.inter_data) || " "
            }))
        } else {
            response.writeHead(403, {"Content-Type": "application/json; charset=utf-8"})
            response.end(JSON.stringify({
                error : 1,
                reason: "ACCESS DENIDED",
                chat: "SERVER PROBLEM, RESTART YOUR GAME",
                chat_inter: "",
                cones: " ",
                inter_info : " "
            }))
        }
    } else {
        response.writeHead(403, {"Content-Type": "application/json; charset=utf-8"})
        response.end(JSON.stringify({
            error : 1,
            reason: "ACCESS DENIDED",
            chat: "SERVER PROBLEM, RESTART YOUR GAME",
            chat_inter: "",
            cones: " ",
            inter_info : " "
        }))
    }
}

function page_gameAPI_disconnect(response, post, utils){
    let data = qs.parse(post)
    if(data.ID != undefined && data.reason != undefined){
        let player = DATAS.players[ Number(data.ID) ]
        if(player != undefined && player.active == true){
            CTA_message.push("<i>" + DATAS.players[ Number(data.ID) ].pseudo + " has left (" + utils.safeInput(data.reason) + ")</i>")
            addLog("deconnection du joueur : " + DATAS.players[ Number(data.ID) ].pseudo + "  |  reason : " + utils.safeInput(data.reason))
            DISC_log.send("", {
                embed:{
                    title: "**On The CALL** : deconnection de " + DATAS.players[ Number(data.ID) ].pseudo + " (" + utils.safeInput(data.reason) + ")",
                    color: 0x9C27B0
                }
            })
            DATAS.players[ Number(data.ID) ].active = false
            DATAS.players[ Number(data.ID) ].vhc_inter = false
        }
    }

    response.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8"
    })
    response.end("OK")
}

function page_gameAPI_init(response, post, utils){
    let data = qs.parse(post)
    if(data.pseudo != undefined && data.pass != undefined){
        console.log(data.pseudo + " se connecte")
        doSQL("SELECT * FROM players WHERE pseudo = '" + utils.safeInputSQL(data.pseudo) + "' AND password = '" + utils.safeInputSQL(data.pass) + "'", function (resultPL) {
            if(resultPL[0] != undefined && resultPL[0].pseudo == data.pseudo && resultPL[0].password == data.pass){
                DATAS.players[resultPL[0].ID] = {
                    ID : resultPL[0].ID,
                    lastwave: kick_waves,
                    pseudo : utils.safeInputSQL(data.pseudo),
                    grade : resultPL[0].grade,
                    modo : resultPL[0].ismodo,
                    CTA : resultPL[0].isCTA,
                    IP : "",
                    active: true,
                    x: 36.42,
                    y: -7.6,
                    incar: 0,
                    vhc_inter: ""
                }
                response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"})
                response.end(JSON.stringify({
                    error : 0,
                    reason: "ALLOWED",
                    ID: resultPL[0].ID,
                    pseudo: resultPL[0].pseudo,
                    grade: resultPL[0].grade,
                    modo : resultPL[0].ismodo,
                    CTA : resultPL[0].isCTA
                }))
                
                addLog("connection du joueur : " + resultPL[0].pseudo)
                DISC_log.send("", {
                    embed:{
                        title: "**On The CALL** : connection de " + resultPL[0].pseudo,
                        color: 0x4CAF50
                    }
                })
            } else {
                response.writeHead(403, {"Content-Type": "application/json; charset=utf-8"})
                response.end(JSON.stringify({
                    error : 1,
                    reason: "ACCESS DENIDED",
                    ID: 0,
                    pseudo: "",
                    grade: "",
                    modo : 0,
                    CTA : 0
                }))
                
                addLog("joueur non  autoriser : " + data.pseudo + "  |  with password : " + data.pass)
                DISC_log.send("", {
                    embed:{
                        title: "**On The CALL** : tentative de connection d'un joueur inexistant",
                        description: utils.safeInputSQL(data.pseudo),
                        color: 0xFF9800
                    }
                })
            }
        }, response)
    }
}
function page_gameAPI_action(response, post, utils){
    let data = qs.parse(post)
    if(data.action != undefined && data.data1 != undefined && data.data2 != undefined && data.data3 != undefined){

        if(data.action == "keycone"){
            let x = Number(utils.safeInputSQL(data.data1))
            let y = Number(utils.safeInputSQL(data.data2))
            let step = 0
            for (let i = 0; i < 100; i++) {
                if(DATAS.cones[i] != ""){
                    let coords = DATAS.cones[i].split('#')
                    if((Number(coords[0]) - x <= 1 && Number(coords[0]) - x >= -1) && (Number(coords[1]) - y <= 1 && Number(coords[1]) - y >= -1)){
                        DATAS.cones[i] = ""
                        step = 2
                        break;
                    }
                }
            }
            if(step == 0){
                for (let i = 0; i < 100; i++) {
                    if(DATAS.cones[i] == "" && step == 0){
                        DATAS.cones[i] = "" + x + "#" + (y + 1)
                        step = 1
                        break;
                    }
                }
            }
        } else if(data.action == "entervhc"){
            if(DATAS.vehicle[utils.safeInputSQL(data.data2)] != undefined && DATAS.vehicle[utils.safeInputSQL(data.data2)].driver == 0){
                DATAS.vehicle[utils.safeInputSQL(data.data2)].driver = Number(utils.safeInputSQL(data.data1))
                addLog(Number(utils.safeInputSQL(data.data1)) + " is now driver of " + utils.safeInputSQL(data.data2))
            }
        } else if(data.action == "exitvhc"){
            for (const key in DATAS.vehicle) {
                if (DATAS.vehicle.hasOwnProperty(key)) {
                    const element = DATAS.vehicle[key];
                    if(element.driver == Number(utils.safeInputSQL(data.data1))){
                        DATAS.vehicle[key].driver = 0
                    }
                }
            }
        } else if(data.action == "codevhc"){
            for (const key in DATAS.vehicle) {
                if (DATAS.vehicle.hasOwnProperty(key)) {
                    const element = DATAS.vehicle[key];
                    if(element.driver == Number(utils.safeInputSQL(data.data1))){
                        DATAS.vehicle[key].code = Number(utils.safeInputSQL(data.data2))
                    }
                }
            }
        } else if(data.action == "setGyro2model"){
            if (DATAS.vehicle[utils.safeInputSQL(data.data1)] != undefined) {
                DATAS.vehicle[utils.safeInputSQL(data.data1)].gyro2 = Number(utils.safeInputSQL(data.data2))
            }
        } else if(data.action == "check_inconsciente"){
            manageInter.interactInter("check_inconsciente", [data.data1, data.data2, data.data3], DATAS.inter_data)
        } else if(data.action == "check_respire"){
            manageInter.interactInter("check_respire", [data.data1, data.data2, data.data3], DATAS.inter_data)
        } else if(data.action == "check_identitee"){
            manageInter.interactInter("check_identitee", [data.data1, data.data2, data.data3], DATAS.inter_data)
        } else if(data.action == "search_hurt_zone"){
            manageInter.interactInter("search_hurt_zone", [data.data1, data.data2, data.data3], DATAS.inter_data)
        } else if(data.action == "medic_soins_desinfecter"){
            manageInter.interactInter("medic_soins_desinfecter", [data.data1, data.data2, data.data3], DATAS.inter_data)
        } else if(data.action == "medic_soins_bandage"){
            manageInter.interactInter("medic_soins_bandage", [data.data1, data.data2, data.data3], DATAS.inter_data)
        } else if(data.action == "medic_soins_antidouleur"){
            manageInter.interactInter("medic_soins_antidouleur", [data.data1, data.data2, data.data3], DATAS.inter_data)
        } else if(data.action == "medic_soins_pansement"){
            manageInter.interactInter("medic_soins_pansement", [data.data1, data.data2, data.data3], DATAS.inter_data)
        } else if(data.action == "medic_put_collier_cervical"){
            manageInter.interactInter("medic_put_collier_cervical", [data.data1, data.data2, data.data3], DATAS.inter_data)
        } else if(data.action == "medic_rcp"){
            manageInter.interactInter("medic_rcp", [data.data1, data.data2, data.data3], DATAS.inter_data)
        } else if(data.action == "medic_asistance_resp"){
            manageInter.interactInter("medic_asistance_resp", [data.data1, data.data2, data.data3], DATAS.inter_data)
        } else if(data.action == "medic_put_victim_in_brancard"){
            manageInter.interactInter("medic_put_victim_in_brancard", [data.data1, data.data2, data.data3], DATAS.inter_data)
        } else if(data.action == "medic_rentrer_brancard_dans"){
            manageInter.interactInter("medic_rentrer_brancard_dans", [data.data1, data.data2, data.data3], DATAS.inter_data)
        } else if(data.action == "medic_prendre_brancard_avec_victime"){
            manageInter.interactInter("medic_prendre_brancard_avec_victime", [data.data1, data.data2, data.data3], DATAS.inter_data)
        } else if(data.action == "medic_deposer_brancard_hopital"){
            manageInter.interactInter("medic_deposer_brancard_hopital", [data.data1, data.data2, data.data3], DATAS.inter_data)
        }
        else if(data.action == "victime_talk"){
            manageInter.reconizeText(data.data1, DATAS.inter_data)
        }

        response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"})
        response.end(JSON.stringify({error : 0,status: "ALLOWED"}))
    } else {
        response.writeHead(400, {"Content-Type": "application/json; charset=utf-8"})
        response.end(JSON.stringify({error : 1,status: "DATA NOT ALLOWED"}))
    }
}


module.exports = {
    ask : function(path, get, post, req, res, utils){
        if(path == "/"){
            page_home(res, utils)
        } else if(path == "/cta.css"){
            page_css(res, utils)
        } else if(path == "/cta.js"){
            page_js(res, utils)
        } else if(path == "/API/fetch"){
            page_API_fetch(res)
        } else if(path == "/API/updateVHC"){
            page_API_updateVHC(res, post, utils)
        } else if(path == "/API/updateINTER"){
            page_API_updateINTER(res, post, utils)
        } else if(path == "/API/newMSG"){
            page_API_newMSG(res, post, utils)
        } else if(path == "/API/customMSG"){
            page_API_customMSG(res, post, utils)
        } else if(path == "/gameAPI/fetch"){
            page_gameAPI_fetch(res, post)
        } else if(path == "/gameAPI/init"){
            page_gameAPI_init(res, post, utils)
        } else if(path == "/gameAPI/action"){
            page_gameAPI_action(res, post, utils)
        } else if(path == "/gameAPI/newMSG"){
            page_gameAPI_newMSG(res, post, utils)
        } else if(path == "/gameAPI/disconnect"){
            page_gameAPI_disconnect(res, post, utils)
        } else if(path.startsWith("/img/")){
            utils.redirectIMG(res, "cta", path)
        } else {
            DISC_log.send("", {
                embed:{
                    title: "**On The CALL** : tentative d'accès à un lien inexistant",
                    description: path,
                    color: 0xFF9800
                }
            })
            utils.error404(res, "La page que vous chercher n'existe pas. Retour sur <a href='cta.loulou123546.fr'>cta.loulou123546.fr</a>")
            addLog("lien inexistant : " + path)
        }
    }
}

/////////////////////////////////////////////////////// UDP for game

function decodeUDP(input){
    let first = new RegExp(/(.*)\#([0-9]*?)\#/, "i")
    let res1 = input.match(first)
    if(res1.length == 3 && (Number(res1[2])) >= 1){
        let second = new RegExp('(.*)\#([0-9]*?)\#' + '(?:\{\{(.*?)\}\}\\+)'.repeat(Number(res1[2]) - 1) + '(?:\{\{(.*?)\}\})', "i")
        let res2 = input.match(second)
        if(res2 != null && res2.length == 3 + (Number(res1[2]))){
            if(Number(res2[2]) == res2.slice(3).length){
                return {
                    action: res2[1],
                    args_size: Number(res2[2]),
                    args : res2.slice(3)
                }
            } else {
                return {
                    action: "INVALID",
                    args_size: 0,
                    args : [],
                    err: 3
                }
            }
        } else {
            return {
                action: "INVALID",
                args_size: 0,
                args : [],
                err: 2
            }
        }
    } else {
        return {
            action: "INVALID",
            args_size: 0,
            args : [],
            err: 1
        }
    }
}


const socket = dgram.createSocket({type: "udp4", reuseAddr: true}, (msg, info) => {
    const income = msg.toString()
    let data = decodeUDP(income)
    let toreturn = ""
    switch (data.action) {
        case "setAlive":
            if(DATAS.players[ Number(data.args[0]) ] != undefined){
                DATAS.players[ Number(data.args[0]) ].IP = info.address
                DATAS.players[ Number(data.args[0]) ].lastwave = kick_waves
                CTA_message.push("<i>" + DATAS.players[ Number(data.args[0]) ].pseudo + " joined</i>")
                toreturn = "Connection-Ready"
            } else {
                toreturn = "Connection-Echec"
            }
            break;
        case "setmypos":
            toreturn = DATAS.setmypos(data, socket)
            break;
        case "getposof":
            toreturn = DATAS.getposof(data)
            break;
        default:
            break;
    }
    if(toreturn != ""){
        socket.send(Buffer.from(toreturn), 26001, info.address, err => {
            if (err) console.error(err)
        })
    }
    
}).bind(26001)


//////////////////////////////////////////////// DISCORD

let DISC_bot = new Discord.Client()

let DISC_chan = false
let DISC_log = false

DISC_bot.on('ready', () => {
    setTimeout(() => {
        DISC_bot.user.setPresence({status: "online", game:{name:"&otc help"}})
        DISC_bot.channels.forEach(element => {
            if(element.id == 521325112843304970){
                DISC_chan = element
                renew30()
            }
            if(element.id == 521330029251002389){
                let auj = new Date()
                DISC_log = element
                DISC_log.send("", {
                    embed:{
                        title: "**On The CALL** : connection après reboot réussi",
                        color: 0x4CAF50,
                        fields:[
                            {name:"Version",value:"`0.4.2`"},
                            {name:"Heure du serveur",value:"`" + auj.getHours() + ":" + auj.getMinutes() + ":" +  + auj.getSeconds() + "`"}
                        ],
                        footer: {
                            text:"On The CALL, premier simulateur de pompier gratuit"
                        }
                    }
                })
            }
        })
    }, 500)
})

function renew30(){
    DISC_bot.user.setPresence({status: "online", game:{name:"&otc help"}})
}

DISC_bot.on("message", (msg) => {
    let arg = msg.content.split(" ")

    if(msg.content.startsWith("&otc")){
        if(msg.content.startsWith("&otc search")){
            bot_lexique.newMSG(msg, MSQL)
        } else if(msg.content.startsWith("&otc testIA")){
            switch (manageInter.reconizeText(arg.slice(2).join(" "))) {
                case "not_finded":
                    msg.channel.send("", {
                        embed:{ title: "**On The CALL** : Alpha de l'IA", description: "Pour la question : " + arg.slice(2).join(" "), color: 0x29B6F6, fields:[
                                {name:"Compris par l'IA :",value:"Question non identifiable"}
                            ], footer: { text:"On The CALL, premier simulateur de pompier gratuit" } }
                    })
                    break;
                case "ask_state":
                    msg.channel.send("", {
                        embed:{ title: "**On The CALL** : Alpha de l'IA", description: "Pour la question : " + arg.slice(2).join(" "), color: 0x29B6F6, fields:[
                                {name:"Compris par l'IA :",value:"Demande sur l'état de la victime (blessure, ressenti, ...)"}
                            ], footer: { text:"On The CALL, premier simulateur de pompier gratuit" } }
                    })
                    break;
                case "ask_what_passed":
                    msg.channel.send("", {
                        embed:{ title: "**On The CALL** : Alpha de l'IA", description: "Pour la question : " + arg.slice(2).join(" "), color: 0x29B6F6, fields:[
                                {name:"Compris par l'IA :",value:"Demande sur ce qu'il s'est passée (circonstance de l'accident, ...)"}
                            ], footer: { text:"On The CALL, premier simulateur de pompier gratuit" } }
                    })
                    break;
                case "salutation":
                    msg.channel.send("", {
                        embed:{ title: "**On The CALL** : Alpha de l'IA", description: "Pour la question : " + arg.slice(2).join(" "), color: 0x29B6F6, fields:[
                                {name:"Compris par l'IA :",value:"Salutation (bonjour c'est les pompiers, ...)"}
                            ], footer: { text:"On The CALL, premier simulateur de pompier gratuit" } }
                    })
                    break;
                default:
                    msg.channel.send("", {
                        embed:{ title: "**On The CALL** : Alpha de l'IA", description: "Pour la question : " + arg.slice(2).join(" "), color: 0x29B6F6, fields:[
                                {name:"Compris par l'IA :",value:"Problème de script"}
                            ], footer: { text:"On The CALL, premier simulateur de pompier gratuit" } }
                    })
                    break;
            }
        } else {
            msg.channel.send("", {
                embed:{
                    title: "**On The CALL** : aide",
                    description: "Toutes les infos nécéssaires concernant le jeu",
                    color: 0xf44336,
                    fields:[
                        {name:"Version",value:"`0.4.2`"},
                        {name:"Reboot",value:"tout les jours à minuit *(heure française)*"},
                        {name:"Outil de recherche",value:"`&otc search help`"}
                    ],
                    footer: {
                        text:"On The CALL, premier simulateur de pompier gratuit"
                    }
                }
            })
        }
    }
})

DISC_bot.login(passwords.bot_key)


renewKick()

DATAS.inter_data = manageInter.generateInter()

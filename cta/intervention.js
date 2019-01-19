let fs = require('fs')
let FuzzySet = require('fuzzyset.js')

var availablesQandR = JSON.parse(fs.readFileSync("cta/fakeIA.json", 'utf8'))
var Questions = []
for (const temp_key in availablesQandR) {
    if (availablesQandR.hasOwnProperty(temp_key)) {
        Questions.push(temp_key)
    }
}
var FuzzyVictime = FuzzySet(Questions)

const FILES_INTERS = [
    "cta/inters/dev/SAP_01.json",
    "cta/inters/dev/SAP_02.json",
    "cta/inters/dev/SAP_03.json",
    "cta/inters/dev/SAP_04.json",
    "cta/inters/dev/SAP_05.json"
]

function selectValue (input){
    /*

        Victimes : les notations des etats :

        yes = de base à oui, mais peut changer selon les actions
        no = de base à non, mais peut changer
        %x = à  x %  d'etre à yes au debut

        __yes = ne peut pas changer
        __no = ne peut pas s'améliorer
        __%x = une fois le nombre aleatoire choisi, ne peut plus changer

    */
    if(input == "__yes" || input == "yes"){
        return true
    } else if(input == "__no" || input == "no") {
        return false
    } else if(input.startsWith("__%") == true) {
        return (Math.floor(Math.random() * 100) + 1) <= input.slice(3)
    } else if(input.startsWith("%") == true) {
        return (Math.floor(Math.random() * 100) + 1) <= input.slice(1)
    }
}

function randomName (gender){
    var Nom = ["Aratchis", "Martin", "Thomas", "Laurent", "Leroux", "Collet", "Picard", "Bonnet", "Leblanc"]
    var PrenomH = ["Quentin", "Pierre", "Antoine", "Louis", "Jery", "Jeremy", "Fifi", "Bernard", "Jackie"]
    return "Mr. " + PrenomH[Math.floor(Math.random() * PrenomH.length)] + " " + Nom[Math.floor(Math.random() * Nom.length)]
}

function selectRandom () {
    let rand = FILES_INTERS[Math.floor(Math.random() * FILES_INTERS.length)]
    let rawI = fs.readFileSync(rand, 'utf8') ||""
    let inter = JSON.parse(rawI) || {}
    let objI = {
        name: inter.FullName,
        inter_name : inter.Tag,
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

    inter.Victimes.forEach(v => {
        objI.datas.victimes[v.ID] = {
            respire : selectValue(v.Start.Breath),
            conscient : selectValue(v.Start.Consciensous),
            haveIDcard : selectValue(v.Start.IDcard),
            fullname : randomName("H"),
            blessures : v.Start.HurtZones,
            collier_cerv : false
        }
        objI.shared_data.victimes[v.ID] = {
            pos : v.Start.pos,
            IDfollow : -1
        }
    })

    return objI
}

function generateInter () {
    let newInter = selectRandom()
    return newInter
}

function interactInter (action, actionD, interD) {
    let IDpart = -1
    if(actionD[0].startsWith(interD.inter_name + ":")){
        IDpart = Number( actionD[0].split(":")[1] )
    }
    if(action == "check_inconsciente"){
        if (interD.datas.victimes[IDpart].conscient == true) {
            interD.chat_inter.push("Monsieur, c'est les pompiers, si vous m'entendez serrez moi la main, ouvrez les yeux")
            setTimeout(() => {
                interD.chat_inter.push("<i>Victime consciente</i>")
            }, 3500)
        } else {
            interD.chat_inter.push("Monsieur, c'est les pompiers, si vous m'entendez serrez moi la main, ouvrez les yeux")
            setTimeout(() => {
                interD.chat_inter.push("<i>Victime inconsciente</i>")
            }, 2000)
        }
    } else if(action == "check_respire"){
        if (interD.datas.victimes[IDpart].respire == true) {
            interD.chat_inter.push("<i>Vous prenez le pouls ...</i>")
            setTimeout(() => {
                interD.chat_inter.push("<i>La victime respire</i>")
            }, Math.floor(Math.random() * 5000) + 5000)
        } else {
            interD.chat_inter.push("<i>Vous prenez le pouls ...</i>")
            setTimeout(() => {
                interD.chat_inter.push("<b>Absence de pouls</b>")
            }, 7500)
        }
    } else if(action == "check_identitee"){
        if (interD.datas.victimes[IDpart].haveIDcard == true) {
            interD.chat_inter.push("<i>Vous fouillez les poches de la victimes</i>")
            setTimeout(() => {
                interD.chat_inter.push("<i>vous trouvé sa carte d'identité : " + interD.datas.victimes[IDpart].fullname + "</i>")
            }, Math.floor(Math.random() * 5000) + 5000)
        } else {
            interD.chat_inter.push("<i>Vous fouillez les poches de la victimes</i>")
            setTimeout(() => {
                interD.chat_inter.push("<b>Pas de papiers d'identités</b>")
            }, Math.floor(Math.random() * 5000) + 5000)
        }
    } else if(action == "search_hurt_zone"){
        if (interD.datas.victimes[IDpart].blessures.length < 1) {
            interD.chat_inter.push("<i>Vous cherchez les blessures</i>")
            setTimeout(() => {
                interD.chat_inter.push("<i>Pas blessures apparente</i>")
            }, 5000)
        } else {
            interD.chat_inter.push("<i>Vous cherchez les blessures</i>")
            interD.datas.victimes[IDpart].blessures.forEach(element => {
                setTimeout(() => {
                    interD.chat_inter.push("<b>" + element + "</b>")
                }, Math.floor(Math.random() * 7000) + 3000)
            })
        }
    } else if(action == "medic_soins_desinfecter"){
        interD.chat_inter.push("<i>Vous desinfecter : " + actionD[1] + "</i>")
    } else if(action == "medic_soins_bandage"){
        interD.chat_inter.push("<i>Vous mettez un bandage autour de : " + actionD[1] + "</i>")
    } else if(action == "medic_soins_antidouleur"){
        interD.chat_inter.push("<i>Vous mettez de l'anti-douleur sur : " + actionD[1] + "</i>")
    } else if(action == "medic_soins_pansement"){
        interD.chat_inter.push("<i>Vous mettez un pansement sur : " + actionD[1] + "</i>")
    } else if(action == "medic_put_collier_cervical"){
        if (interD.datas.victimes[IDpart].collier_cerv == false) {
            interD.chat_inter.push("<i>Vous posez le collier cervical</i>")
            interD.datas.victimes[IDpart].collier_cerv = true
            setTimeout(() => {
                interD.chat_inter.push("<i>Collier posé</i>")
            }, 4000)
        } else {
            interD.chat_inter.push("<i>Le collier est déjà posé</i>")
        }
    } else if(action == "medic_rcp"){
        if(interD.datas.victimes[IDpart].respire == true){
            interD.chat_inter.push("<b>La victime respire, ne fait pas une RCP ou tu vas la tuer !</b>")
        } else {
            FILES_INTERS.forEach(fichier => {
                if(fichier.endsWith(interD.inter_name + ".json")){

                    let rawI = fs.readFileSync(fichier, 'utf8') ||""
                    let inter = JSON.parse(rawI) || {}
                    if(inter.Victimes[IDpart].Start.Breath.startsWith("__")){
                        setTimeout(() => {
                            interD.chat_inter.push("<i>1, 2, 3, CHOC !</i>")
                        }, 1000)
                        setTimeout(() => {
                            interD.chat_inter.push("<b>Pouls inexistant, echec de la RCP</b>")
                        }, 6500)
                    } else {
                        setTimeout(() => {
                            interD.chat_inter.push("<i>1, 2, 3, CHOC !</i>")
                        }, 1000)
                        setTimeout(() => {
                            if( (Math.floor(Math.random() * 100) + 1) <= inter.Victimes[IDpart].Probability.RCP ){
                                interD.datas.victimes[IDpart].respire = true
                                interD.chat_inter.push("<b>Reprise d'un léger Pouls</b>")
                            } else {
                                interD.chat_inter.push("<b>Pouls inexistant, echec de la RCP</b>")
                            }
                        }, 6500)
                    }

                }
            })
        }
    } else if(action == "medic_asistance_resp"){
        if(interD.datas.victimes[IDpart].conscient == true){
            interD.chat_inter.push("<b>La victime est consciente, elle n'a pas besoins d'assistance respiratoire</b>")
        } else if(interD.datas.victimes[IDpart].respire == false){
            interD.chat_inter.push("<b>La victime ne respire pas, fait d'abord une RCP</b>")
        } else {
            FILES_INTERS.forEach(fichier => {
                if(fichier.endsWith(interD.inter_name + ".json")){

                    let rawI = fs.readFileSync(fichier, 'utf8') ||""
                    let inter = JSON.parse(rawI) || {}
                    if(inter.Victimes[IDpart].Start.Consciensous.startsWith("__")){
                        setTimeout(() => {
                            interD.chat_inter.push("<i>Je pose le masque</i>")
                        }, 500)
                        setTimeout(() => {
                            interD.chat_inter.push("<b>Pas de réactions, je retire le masque</b>")
                        }, 6500)
                    } else {
                        setTimeout(() => {
                            interD.chat_inter.push("<i>Je pose le masque</i>")
                        }, 1000)
                        setTimeout(() => {
                            if( (Math.floor(Math.random() * 100) + 1) <= inter.Victimes[IDpart].Probability.O2 ){
                                interD.datas.victimes[IDpart].conscient = true
                                interD.chat_inter.push("<b>La victime se reveil, je retire le masque</b>")
                            } else {
                                interD.chat_inter.push("<b>Pas de réactions, je retire le masque</b>")
                            }
                        }, 6500)
                    }

                }
            })
        }
    } else if(action == "medic_put_victim_in_brancard"){
        if (interD.shared_data.victimes[IDpart].IDfollow == -1) {
            interD.shared_data.victimes[IDpart].IDfollow = Number(actionD[1])
            interD.chat_inter.push("<i>Vous mettez la victime sur le brancard</i>")
        } else {
            interD.chat_inter.push("<i>La victime est déjà ailleurs</i>")
        }
    } else if(action == "medic_rentrer_brancard_dans"){
        for (const key in interD.shared_data.victimes) {
            if (interD.shared_data.victimes.hasOwnProperty(key)) {
                const element = interD.shared_data.victimes[key]
                if(element.IDfollow == Number(actionD[1])){
                    interD.shared_data.victimes[key].IDfollow = actionD[0]
                    interD.chat_inter.push("<i>La victime est maintenant dans le " + actionD[0] + "</i>")
                }
            }
        }
    } else if(action == "medic_prendre_brancard_avec_victime"){
        for (const key in interD.shared_data.victimes) {
            if (interD.shared_data.victimes.hasOwnProperty(key)) {
                const element = interD.shared_data.victimes[key]
                if(element.IDfollow == actionD[0]){
                    interD.shared_data.victimes[key].IDfollow = Number(actionD[1])
                    interD.chat_inter.push("<i>La victime est sur le brancard</i>")
                }
            }
        }
    } else if(action == "medic_deposer_brancard_hopital"){
        for (const key in interD.shared_data.victimes) {
            if (interD.shared_data.victimes.hasOwnProperty(key)) {
                const element = interD.shared_data.victimes[key]
                if(element.IDfollow == Number(actionD[0])){
                    interD.shared_data.victimes[key].IDfollow = -2
                    interD.shared_data.victimes[key].pos.z = 10
                    interD.chat_inter.push("<i>Le CHU a récupérer la victime</i>")
                }
            }
        }
    }
}

function reconizeText (original){
    original = original.toLowerCase()
    let res = FuzzyVictime.get(original, [0, "not finded"])
    let best = [0, "not finded"]
    res.forEach(element => {
        if(element[0] > best[0]){
            best = element
        }
    })
    if(best[1] == "not finded"){
        return "not_finded"
    } else {
        return availablesQandR[best[1]]
    }
}

function getDataString (interD) {
    let out = ""
    //blessures
    for (const k in interD.datas.victimes) {
        if (interD.datas.victimes.hasOwnProperty(k)) {
            const el = interD.datas.victimes[k]
            if (el.blessures.length < 1) {
                out += "Victim_blessure#" + interD.inter_name + "#" + k + "#nohurt"
            } else {
                out += "Victim_blessure#" + interD.inter_name + "#" + k + "#" + el.blessures.join(':')
            }
        }
    }
    
    return out
}

function stopInter () {
    //not sure if it will be usefull
}

module.exports = {
    selectRandom : selectRandom,
    generateInter : generateInter,
    interactInter : interactInter,
    getDataString : getDataString,
    reconizeText : reconizeText,
    stopInter : stopInter
}

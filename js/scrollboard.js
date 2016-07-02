/**
 * scrollboard.js
 * @version 1.0.0
 * @author xuan
 */




function TeamProblem() {
    this.alphabetId = "";
    this.isAccepted = false;
    this.penalty = 0; //罚时毫秒数
    this.acceptedTime = new Date(); //AC时间
    this.submitCount = 0; //AC前提交次数，如果AC了，值加1
    this.isUnkonwn = false; //是否为封榜后提交，如果封榜前已AC，也为false
}

/**
 * Submit对象
 * @param {int}     submitId    全局runID
 * @param {int}     teamId      队伍ID
 * @param {String}  alphabetId  比赛中的题目ID：A,B,C...
 * @param {int}     subTime     提交时间
 * @param {int}     resultId    判题结果ID
 */
function Submit(submitId, teamId, alphabetId, subTime, resultId) {
    this.submitId = submitId; //全局runID
    this.teamId = teamId; //队伍ID
    this.alphabetId = alphabetId; //比赛中的题目ID：A,B,C,D...
    this.subTime = new Date(subTime);
    /**
     * 判题结果ID
     * @type {int}
     * @value 0 Accepted
     * @value 1 Presentation Error
     * @value 2 Time Limit Exceeded
     * @value 3 Memory Limit Exceeded
     * @value 4 Wrong Answer
     * @value 5 Runtime Error
     * @value 6 Output Limit Exceeded
     * @value 7 Compile Error
     * @value 8 System Error
     * @value 9 Security Error
     * @value -1 Waiting
     */
    this.resultId = resultId;
}

/**
 * Team对象
 * @param {int}     teamId      队伍ID
 * @param {String}  teamName    队伍名
 * @param {String}  teamMember  队员
 * @param {boolean} official     是否计入排名
 */
function Team(teamId, teamName, teamMember, official) {
    this.teamId = teamId; //队伍ID
    this.teamName = teamName; //队伍名
    this.teamMember = teamMember; //队员
    this.official = true; //计入排名
    this.solved = 0; //通过数
    this.penalty = 0; //罚时,单位为毫秒
    this.gender = false; //女队,默认否
    this.submitProblemList = []; //提交题目列表
    this.unkonwnAlphabetIdMap = new Array(); //未知的题目AlphabetId列表
    this.submitList = []; //提交列表
    this.lastRank = 0; //最终排名
    this.nowRank = 0; //当前排名
}

/**
 * Team对象初始化函数，更新到封榜时的状态
 * @param  {Date}   startTime       比赛开始时间
 * @param  {Date}   freezeBoardTime 封榜时间
 */
Team.prototype.init = function(startTime, freezeBoardTime) {
    //按提交顺序排序
    this.submitList.sort(function(a, b) {
        return a.submitId - b.submitId;
    });
    for (var key in this.submitList) {
        var sub = this.submitList[key];
        //创建对象
        var p = this.submitProblemList[sub.alphabetId];
        if (!p) p = new TeamProblem();
        //设置alphabetId
        p.alphabetId = sub.alphabetId;
        //已经AC的题目不再计算
        if (p.isAccepted) continue;
        //封榜后的提交设置isUnkonwn为true
        if (sub.subTime > freezeBoardTime) {
            p.isUnkonwn = true;
            this.unkonwnAlphabetIdMap[p.alphabetId]=true;
        }
        //增加提交次数
        p.submitCount++;
        //更新AC状态
        p.isAccepted = (sub.resultId == 0);
        //如果当前提交AC
        if (p.isAccepted) {
            //则保存AC时间
            p.acceptedTime = sub.subTime.getTime() - startTime.getTime();
            //如果为封榜前AC，则计算罚时,且队伍通过题数加1
            if (p.acceptedTime < freezeBoardTime-startTime) {
                p.penalty += p.acceptedTime + (p.submitCount - 1) * 20 * 60 * 1000;
                this.solved++;
                this.penalty += p.penalty;
            }
        }
        
        //更新submitProblemList
        this.submitProblemList[p.alphabetId] = p;
    }
}

Team.prototype.countUnkonwnProblme = function(){
	var count = 0;
	for(var key in this.unkonwnAlphabetIdMap){
		count++;
	}
	return count;
}

/**
 * 滚榜时，更新一个队伍的一个题的状态
 * @return {boolean} true:当前队伍排名上升,false:排名无变化
 */
Team.prototype.updateOneProblem = function() {
    for (var key in this.submitProblemList) {
        var subProblem = this.submitProblemList[key];
        //如果题目结果未知
        if (subProblem.isUnkonwn) {
            //更新题目状态
            subProblem.isUnkonwn = false;
            delete this.unkonwnAlphabetIdMap[subProblem.alphabetId];
            //如果AC，则更新题目状态
            if (subProblem.isAccepted) {
                subProblem.penalty += subProblem.acceptedTime + (subProblem.submitCount - 1) * 20 * 60 * 1000;
                this.solved++;
                this.penalty += subProblem.penalty;
                return true;
            }
            return false;
        }
    }
}


/**
 * 队伍排位函数
 * @param {Team} a Team a
 * @param {Team} b Team b
 * @return {int} 负数a排位高，正数b排位高
 */
function TeamCompare(a, b) {
    if (a.solved != b.solved) //第一关键字，通过题数高者排位高
        return a.solved > b.solved ? -1 : 1;
    if (a.penalty != b.penalty) //第二关键字，罚时少者排位高
        return a.penalty < b.penalty ? -1 : 1;
    return a.teamId < b.teamId ? -1 : 1; //第三关键字，队伍ID小者排位高
}

/**
 * 从服务器获取提交列表
 * @return {Array<Submit>} 初始化后的Submit对象数组
 */
function getSubmitList() {
    var data = new Array();
    $.ajax({
        type: "GET",
        content: "application/x-www-form-urlencoded",
        url: "data/submitData.json",
        dataType: "json",
        data: {},
        async:false,
        success: function(result) {
            for (var key in result.data) {
                var sub = result.data[key];
                data.push(new Submit(sub.submitId, sub.userId, sub.alphabetId, sub.subTime, sub.resultId));
            }
            
        },
        error: function() {
            alert("获取Submit数据失败");
        }
    });
    return data;
}

/**
 * 从服务器获取队伍列表
 * @return {Array<Team>} 初始化后的Team对象数组
 */
function getTeamList() {
    var data = new Array();
    $.ajax({
        type: "GET",
        content: "application/x-www-form-urlencoded",
        url: "data/teamData.json",
        dataType: "json",
        async:false,
        data: {},
        success: function(result) {
            for (var key in result.data) {
                var team=result.data[key];
                data[team.teamId] = new Team(team.teamId, team.nickname, team.realname, team.official);
            }
        },
        error: function() {
            alert("获取Team数据失败");
        }
    });
    return data;
}

/**
 * Board对象
 * @param {int}         problemCount    题目数量
 * @param {Array<int>}  medalCounts     奖牌数,无特等奖则为3个数,有特等奖则为4个数,第一个为特等奖
 * @param {Date}        startTime       比赛开始时间
 * @param {Date}        freezeBoardTime 封榜时间
 */
function Board(problemCount, medalCounts, startTime, freezeBoardTime) {
    this.problemCount = problemCount; //题目数量
    this.medalCounts = medalCounts; //奖牌数数组,无特等奖则为3个数,有特等奖则为4个数，第一个为特等奖
    this.problemList = []; //题目alphabetId编号列表
    this.startTime = startTime;
    this.freezeBoardTime = freezeBoardTime;
    this.teamList = []; //从服务器获取的teamList，为teamId与Team对象的映射
    this.submitList = []; //从服务器获取的所有的submitList,Submit对象数组
    this.teamNowSequence = []; //当前队伍排名，存队伍ID
    this.teamNextSequence = []; //下一步队伍排名，存队伍ID
    this.teamCount = 0; //队伍数量
    this.displayTeamPos = 0;	//当前展示的队伍位置

    //根据题目数量设置alphabetId
    var ACode = 65;
    for (var i = 0; i < problemCount; i++)
        this.problemList.push(String.fromCharCode(ACode + i));

    //从服务器得到submitList和teamList
    this.submitList = getSubmitList();
    this.teamList = getTeamList();

    

    //将submit存到对应的Team对象里
    for (var key in this.submitList) {
        var sub = this.submitList[key];
        this.teamList[sub.teamId].submitList.push(sub);
    }

    

    //初始化Team对象，同时将队伍ID放入序列
    for (var key in this.teamList) {
        var team = this.teamList[key];
        team.init(this.startTime, this.freezeBoardTime);
        this.teamNowSequence.push(team);
        this.teamCount ++;
    }
    this.displayTeamPos = this.teamCount - 1;

    //队伍排序
    this.teamNowSequence.sort(function(a, b) {
        return TeamCompare(a, b);
    });
    this.teamNextSequence = this.teamNowSequence.slice(0);

}


/**
 * 更新队伍排序,得到下一个队伍移动后的序列
 * @return {int} 排名上升的队伍要插入的位置，如果无变化返回-1
 */
Board.prototype.updateTeamSequence = function() {
    var teamSequence = this.teamNextSequence.slice(0);//复制数组
    teamSequence.sort(function(a, b) {
        return TeamCompare(a, b);
    });
    

    //找到第一个改变的位置，即为排名上升的队伍要插入的位置
    var toPos = -1;
    for (var i = 0; i < this.teamCount; i++) {
        if (this.teamNextSequence[i].teamId != teamSequence[i].teamId) {
            toPos = i;
            break;
        }
    }

    this.teamNowSequence = this.teamNextSequence.slice(0);
    this.teamNextSequence = teamSequence.slice(0);

    return toPos;
}


/**
 * 不断更新最后一个unkonwn队伍的题目状态，直到排名发生变化或者无题目可更新
 * @return {Team} 返回正在更新的Team对象，没有则返回null
 */
Board.prototype.UpdateOneTeam = function() {
    //得到需要更新的队伍在当前排名中的的位置
    var updateTeamPos = this.teamCount - 1;
    while (updateTeamPos >= 0 && this.teamNextSequence[updateTeamPos].countUnkonwnProblme() < 1)
        updateTeamPos--;
    //如果有队伍可更新
    if (updateTeamPos >= 0) {
        //不断更新队伍题目状态，直到排名发生变化或者无题目可更新
        while (this.teamNextSequence[updateTeamPos].countUnkonwnProblme() > 0) {
            //更新一个题目状态
            var result = this.teamNextSequence[updateTeamPos].updateOneProblem();
            return this.teamNextSequence[updateTeamPos];
        }
    }
    return null;
}

/**
 * 显示封榜时的状态
 */
Board.prototype.showInitBoard = function() {

    //设置表头宽度百分比
    var rankPer = 5; //Rank列宽度百分比
    var teamPer = 25; //Team列宽度百分比
    var solvedPer = 5; //Solved列宽度百分比
    var penaltyPer = 5; //Penalty列宽度百分比
    var problemStatusPer = 60.0 / this.problemCount; //Problem列宽度百分比

    //表头
    var headHTML =
        "<div class=\"ranktable-head\">\
            <table class=\"table\">\
                <tr>\
                    <th width=\"" + rankPer + "%\">Rank</th>\
                    <th width=\"" + teamPer + "%\">Team</th>\
                    <th width=\"" + solvedPer + "%\">Solved</th>\
                    <th width=\"" + penaltyPer + "%\">Penalty</th>";
    var footHTML =
                "</tr>\
            </table>\
        </div>";
    $('body').append(headHTML+footHTML);


    //题目列
    for (var i = 0; i < this.problemList.length; i++) {
        var alphabetId = this.problemList[i];
        var bodyHTML = "<th width=\"" + problemStatusPer + "%\">" + alphabetId + "</th>";
        $('.ranktable-head tr').append(bodyHTML);
    }


    //队伍
    for (var i = 0; i < this.teamCount; i++) {
        //var team = this.teamList[this.teamNowSequence[i]];
        var team = this.teamNowSequence[i];
        var rank = i + 1;
        var headHTML =
                "<div id=\"team_" + team.teamId + "\" class=\"team-iteam\" team-id=\""+team.teamId+"\"> \
                    <table class=\"table\"> \
                        <tr>";
        var rankHTML =      "<th class=\"rank\" width=\"" + rankPer + "%\">" + rank + "</th>";
        var teamHTML =      "<td class=\"team-name\" width=\"" + teamPer + "%\">" + team.teamName + "<br/>" + team.teamMember + "</td>";
        var solvedHTML =    "<td class=\"solved\" width=\""+solvedPer+"%\">"+ team.solved +"</td>";
        var penaltyHTML =   "<td class=\"penalty\" width=\""+ penaltyPer +"%\">"+ parseInt(team.penalty/1000.0/60.0) +"</td>";
        var problemHTML = "";
        for(var key in this.problemList){
            problemHTML+="<td class=\"problem-status\" width=\""+problemStatusPer+"%\" alphabet-id=\""+this.problemList[key]+"\">";
            var tProblem = team.submitProblemList[this.problemList[key]];
            if(tProblem){
                if(tProblem.isUnkonwn)
                    problemHTML+="<span class=\"label label-warning\">"+tProblem.submitCount+"</span></td>";
                else{
                    if(tProblem.isAccepted){
                        problemHTML+="<span class=\"label label-success\">"+tProblem.submitCount+"/"+parseInt(tProblem.acceptedTime/1000.0/60.0)+"</span></td>";
                    }else{
                        problemHTML+="<span class=\"label label-danger\">"+tProblem.submitCount+"</span></td>";
                    }
                }
            }   
        }
        var footHTML = 
                        "</tr> \
                        </table> \
                    </div>";

        var HTML=headHTML+rankHTML+teamHTML+solvedHTML+penaltyHTML+problemHTML+footHTML;

        $('body').append(HTML);
    }

    var headerHeight = 44;
    var teamHeight = 68;
    for(var i = 0 ; i< this.teamCount ;++i){
        //var teamId = this.teamList[this.teamNowSequence[i]].teamId;
        var teamId = this.teamNowSequence[i].teamId;
        $("div[team-id=\""+ teamId +"\"]").stop().animate({top:i*teamHeight+headerHeight},300);
    }
}

Board.prototype.updateTeamStatus = function(team){

    //更新ProblemStatus
    for (var key in team.submitProblemList) {
        var tProblem = team.submitProblemList[key];
        if (tProblem) {
            problemHTML = "";
            if (tProblem.isUnkonwn)
                problemHTML = "<span class=\"label label-warning\">" + tProblem.submitCount + "</td>";
            else {
                if (tProblem.isAccepted) {
                    problemHTML = "<span class=\"label label-success\">" + tProblem.submitCount + "/" + parseInt(tProblem.acceptedTime / 1000.0 / 60.0) + "</td>";
                } else {
                    problemHTML = "<span class=\"label label-danger\">" + tProblem.submitCount + "</td>";
                }
            }
            var $problemStatus = $("#team_" + team.teamId + " .problem-status[alphabet-id=\"" + key + "\"]");
            var $statusSpan = $problemStatus.children('span[class="label label-warning"]');


            //让题目状态闪烁，并更新状态
            console.log(problemHTML);
            if(tProblem.isUnkonwn==false){
                //加高亮边框前去掉所有高亮边框
                $('.team-iteam.hold').removeClass("hold");
                var $team = $("div[team-id=\""+ team.teamId +"\"]");
                $team.addClass("hold");
                //传参，不懂原理
                (function(problemHTML){
                    var speed = 400;


                    $statusSpan.fadeOut(speed).fadeIn(speed).fadeOut(speed).fadeIn(speed,function(){
                        $(this).parent().html(problemHTML);
                    });
                })(problemHTML);
            }
        }
    }

    //延时更新榜单
    var thisBoard = this;
    //传参，不懂原理
    (function(thisBoard, team) {
        $('body').animate({margin: 0},2200,function(){
            //更新Rank
            for (var i = 0; i < thisBoard.teamCount; i++) {
                var t = thisBoard.teamNextSequence[i];
                var str = "#team_" + t.teamId + " .rank";
                $(str).html(i + 1);
            }

            //更新Solved
            $("#team_" + team.teamId + " .solved").html(team.solved);

            //更新Penaly
            $("#team_" + team.teamId + " .penalty").html(parseInt(team.penalty / 1000.0 / 60.0));
        });
        
    })(thisBoard, team);

    
}


Board.prototype.moveTeam = function(toPos){
	var headerHeight = 44;
    var teamHeight = 68;
    for(var i = 0 ; i< this.teamCount ;++i){
        //var teamId = this.teamList[this.teamNowSequence[i]].teamId;
        var teamId = this.teamNextSequence[i].teamId;
        if(toPos!=-1)
            $("div[team-id=\""+ teamId +"\"]").animate({width: '100%'},2200).animate({top:i*teamHeight+headerHeight},1000);

    }
}

Board.prototype.keydown = function() {
    var team = this.UpdateOneTeam();
    if (team) {
        var toPos = this.updateTeamSequence();
        this.updateTeamStatus(team);
        this.moveTeam(toPos);
        
    } else {
        $('.team-iteam.hold').removeClass("hold");
    }
}



$(function(){
    //2015-02-01 12:00:00 ~ 2015-02-01 17:00:00
    var board = new Board(11,null,new Date(1422763200000),new Date(1422777600000));
    board.showInitBoard();
    $('html').keydown(function(e){
        if(e.keyCode==13){
            board.keydown();
        }
    })
})
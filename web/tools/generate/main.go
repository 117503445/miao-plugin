// generate 将本人的离线账号快照转换为静态角色卡片数据，不请求游戏账号接口。
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// stat 是已经解码的key词条和value数值。
type stat struct {
	Key   string  `json:"key"`
	Value float64 `json:"value"`
	// RollCount为含首次生成的赋值次数；零表示导出未记录。
	RollCount int `json:"rollCount,omitempty"`
}

// artifact 保存idx部位、name名称、set套装、level等级、star星级、main主词条、attrs副词条和image图片。
type artifact struct {
	Idx   int    `json:"idx"`
	Name  string `json:"name"`
	Set   string `json:"set"`
	Level int    `json:"level"`
	Star  int    `json:"star"`
	Main  stat   `json:"main"`
	Attrs []stat `json:"attrs"`
	Image string `json:"image"`
}

// weapon 保存当前武器name名称、level等级、affix精炼、star星级、image图片及bonus静态副属性。
type weapon struct {
	Name      string `json:"name"`
	Level     int    `json:"level"`
	Affix     int    `json:"affix"`
	Ascension int    `json:"ascension"`
	Star      int    `json:"star"`
	Image     string `json:"image"`
	Bonus     stat   `json:"bonus"`
}

// talent 是name技能与level基础等级。
type talent struct {
	Name  string `json:"name"`
	Level int    `json:"level"`
}

// card 保存角色基础信息、当前装备和评分需要的原始属性，不保存认证信息。
type card struct {
	Key       string             `json:"key"`
	ID        int                `json:"id"`
	Name      string             `json:"name"`
	RuleName  string             `json:"ruleName"`
	Game      string             `json:"game"`
	Element   string             `json:"element"`
	Path      string             `json:"path"`
	Level     int                `json:"level"`
	Ascension int                `json:"ascension"`
	Traces    map[string]bool    `json:"traces,omitempty"`
	Cons      int                `json:"cons"`
	Star      int                `json:"star"`
	Image     string             `json:"image"`
	Banner    string             `json:"banner"`
	BaseAttr  map[string]float64 `json:"baseAttr"`
	Attr      map[string]float64 `json:"attr"`
	Weapon    *weapon            `json:"weapon"`
	Talents   []talent           `json:"talents"`
	Artifacts []artifact         `json:"artifacts"`
	Notes     []string           `json:"notes"`
}

// account 保存game游戏、uid公开游戏编号、snapshotAt快照日期及characters角色卡片。
type account struct {
	Game       string `json:"game"`
	UID        string `json:"uid"`
	SnapshotAt string `json:"snapshotAt"`
	Source     string `json:"source"`
	Characters []card `json:"characters"`
}

// generator 记录root上游源码根、out网页public、meta角色元数据与locale英文名称映射。
type generator struct {
	root, out      string
	meta           map[string]map[int][]meta
	locale         map[string]string
	gsSets, srSets map[string]setData
}

// main 解析明确的数据文件路径，生成只含公开角色配装的静态快照与素材。
func main() {
	root := flag.String("root", "../../..", "喵喵源码根目录")
	out := flag.String("out", "../../public", "静态public目录")
	gs := flag.String("gs", "", "原神GOOD快照")
	sr := flag.String("sr", "", "星铁导出快照")
	loc := flag.String("locale", "", "Enka本地化JSON")
	flag.Parse()
	for _, path := range []string{*gs, *sr, *loc} {
		if path == "" {
			panic("必须提供全部快照及名称映射")
		}
	}
	g := generator{root: *root, out: *out, meta: map[string]map[int][]meta{}, locale: map[string]string{}}
	must(os.MkdirAll(filepath.Join(*out, "media"), 0755))
	g.loadLocale(*loc)
	g.loadMeta("gs")
	g.loadMeta("sr")
	read(filepath.Join(*root, "resources/meta-gs/artifact/data.json"), &g.gsSets)
	read(filepath.Join(*root, "resources/meta-sr/artifact/data.json"), &g.srSets)
	accounts := []account{g.genshin(*gs), g.starrail(*sr)}
	commit, err := exec.Command("git", "-C", *root, "rev-parse", "HEAD").Output()
	must(err)
	output := map[string]any{"schema": 1, "generatedAt": time.Now().UTC().Format(time.RFC3339), "upstreamCommit": string(commit), "accounts": accounts}
	raw, err := json.Marshal(output)
	must(err)
	must(os.WriteFile(filepath.Join(*out, "accounts.json"), raw, 0644))
	for _, a := range accounts {
		fmt.Printf("%s：%d张角色卡片\n", a.Game, len(a.Characters))
	}
}

// must 在err非空时中止生成，防止发布不完整数据。
func must(err error) {
	if err != nil {
		panic(err)
	}
}

// read 将path中的JSON解析为dest。
func read(path string, dest any) {
	raw, err := os.ReadFile(path)
	must(err)
	must(json.Unmarshal(raw, dest))
}

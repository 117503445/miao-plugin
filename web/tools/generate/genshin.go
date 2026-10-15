package main

import (
	"fmt"
	"path/filepath"
	"strconv"
	"strings"
)

// gsSource 保存GOOD中角色、武器及圣遗物的公开配装记录。
type gsSource struct {
	Characters []struct {
		Key       string                           `json:"key"`
		Level     int                              `json:"level"`
		Cons      int                              `json:"constellation"`
		Ascension int                              `json:"ascension"`
		Element   string                           `json:"element"`
		Talent    struct{ Auto, Skill, Burst int } `json:"talent"`
	} `json:"characters"`
	Weapons []struct {
		Key              string `json:"key"`
		Level, Ascension int
		Refinement       int    `json:"refinement"`
		Location         string `json:"location"`
	} `json:"weapons"`
	Artifacts []struct {
		SetKey, SlotKey, MainStatKey, Location string
		Level, Rarity                          int
		Substats                               []struct {
			Key   string    `json:"key"`
			Value float64   `json:"value"`
			Rolls []float64 `json:"rolls"`
		} `json:"substats"`
	} `json:"artifacts"`
}

// gsKeys 将GOOD词条名称转换为喵喵评分属性名称。
var gsKeys = map[string]string{"hp": "hpPlus", "hp_": "hp", "atk": "atkPlus", "atk_": "atk", "def": "defPlus", "def_": "def", "critRate_": "cpct", "critDMG_": "cdmg", "enerRech_": "recharge", "eleMas": "mastery", "heal_": "heal", "physical_dmg_": "phy", "pyro_dmg_": "pyro", "hydro_dmg_": "hydro", "cryo_dmg_": "cryo", "electro_dmg_": "electro", "anemo_dmg_": "anemo", "geo_dmg_": "geo", "dendro_dmg_": "dendro"}

// genshin 将path的GOOD角色名称表转换为账号卡片。
func (g *generator) genshin(path string) account {
	var src gsSource
	read(path, &src)
	byName := map[string]meta{}
	for _, items := range g.meta["gs"] {
		for _, m := range items {
			if filepath.Base(m.dir) == m.Name {
				byName[m.Name] = m
			}
		}
	}
	a := account{Game: "gs", UID: "184173680", SnapshotAt: "2026-10-15", Source: "GOODScanner · GOOD v3"}
	for _, c := range src.Characters {
		name := g.locale[norm(c.Key)]
		if c.Key == "Traveler" {
			name = "旅行者"
			if c.Element == "" {
				fmt.Println("已排除无元素重复旅行者记录")
				continue
			}
		}
		m, ok := byName[name]
		if !ok {
			panic("原神角色名称无法关联: " + c.Key + " / " + name)
		}
		image, banner := g.portrait(m)
		element := m.Elem
		if c.Element != "" {
			element = strings.ToLower(c.Element)
		}
		v := card{Key: "gs-" + c.Key, ID: m.ID, Name: name, RuleName: m.Name, Game: "gs", Element: element, Path: m.Path, Level: c.Level, Ascension: c.Ascension, Cons: c.Cons, Star: m.Star, Image: image, Banner: banner, BaseAttr: m.Base, Attr: map[string]float64{"cpct": 5, "cdmg": 50, "mastery": 0, "recharge": 100}, Artifacts: []artifact{}, Notes: []string{}}
		// 使用喵喵的角色等级表补入突破属性，仅供评分规则判断，卡片不伪造战斗增益。
		var attr struct {
			Keys    []string             `json:"keys"`
			Details map[string][]float64 `json:"details"`
		}
		decode(m.data, "attr", &attr)
		values := attr.Details[strconv.Itoa(c.Level)]
		for i, k := range attr.Keys {
			if i < len(values) && !strings.HasSuffix(k, "Base") {
				v.Attr[k] += values[i]
			}
		}
		v.Talents = []talent{{"普攻", c.Talent.Auto}, {"战技", c.Talent.Skill}, {"爆发", c.Talent.Burst}}
		for _, w := range src.Weapons {
			if w.Location != c.Key {
				continue
			}
			weaponName := g.locale[norm(w.Key)]
			data, dir := g.weaponMeta("gs", weaponName, 0)
			if dir == "" {
				panic("武器无法关联: " + w.Key + " / " + weaponName)
			}
			var star int
			decode(data, "star", &star)
			v.Weapon = &weapon{Name: weaponName, Level: w.Level, Ascension: w.Ascension, Affix: w.Refinement, Star: star, Image: g.media(filepath.Join(dir, "icon.webp"))}
			var wa struct {
				BonusKey  string             `json:"bonusKey"`
				BonusData map[string]float64 `json:"bonusData"`
			}
			decode(data, "attr", &wa)
			key := strings.TrimSuffix(wa.BonusKey, "Pct")
			if wa.BonusKey == "atkPct" || wa.BonusKey == "hpPct" || wa.BonusKey == "defPct" {
				key = wa.BonusKey
			}
			v.Weapon.Bonus = stat{Key: key, Value: wa.BonusData[strconv.Itoa(w.Level)]}
		}
		if v.Weapon == nil {
			v.Notes = append(v.Notes, "武器未包含在本次导出中")
		}
		for _, r := range src.Artifacts {
			if r.Location != c.Key {
				continue
			}
			name := g.locale[norm(r.SetKey)]
			var set setData
			for _, s := range g.gsSets {
				if s.Name == name {
					set = s
					break
				}
			}
			if set.Name == "" {
				panic("套装无法关联: " + r.SetKey + " / " + name)
			}
			idx := map[string]int{"flower": 1, "plume": 2, "sands": 3, "goblet": 4, "circlet": 5}[r.SlotKey]
			key := gsKeys[r.MainStatKey]
			if idx == 0 || key == "" {
				panic("未知原神部位或主词条")
			}
			ar := artifact{Idx: idx, Name: set.Idxs[strconv.Itoa(idx)].Name, Set: set.Name, Level: r.Level, Star: r.Rarity, Main: stat{Key: key}, Attrs: []stat{}, Image: g.media(filepath.Join(g.root, "resources/meta-gs/artifact/imgs", set.Name, fmt.Sprint(idx)+".webp"))}
			for _, s := range r.Substats {
				key := gsKeys[s.Key]
				if key == "" {
					panic("未知原神副词条: " + s.Key)
				}
				ar.Attrs = append(ar.Attrs, stat{Key: key, Value: s.Value, RollCount: len(s.Rolls)})
			}
			v.Artifacts = append(v.Artifacts, ar)
		}
		a.Characters = append(a.Characters, v)
	}
	return a
}
